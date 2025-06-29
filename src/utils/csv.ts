import { parse } from 'fast-csv';
import { createReadStream, createWriteStream } from 'fs'; // Use createReadStream and createWriteStream
import * as fs from 'fs/promises'; // Use fs.promises for async file operations like unlink
import { classifyJobTitles } from './ai.js';
import { createRateLimiter } from './rateLimiter.js';
import { getStandardizedJobTitle } from './standardize.js';

interface InputRow {
    id: string;
    job_title: string;
    prhDecisionMakerJobTitle?: string; // Optional, based on your example
}

interface OutputRow {
    id: string;
    job_title: string;
    job_function: string;
    job_seniority: string;
    standardized_job_title: string;
    confidence: number;
}

export async function processCsv(
    inputFilePath: string,
    outputFilePath: string,
    batchSize: number,
    maxRequestsPerMinute: number,
    minWaitBetweenBatches: number,
    verbose: boolean,
    onProgress: (processed: number, total: number, totalBatches: number, estimatedTotalTime: string, estimatedRemainingTime: string) => void
): Promise<void> {
    // Delete output file if it exists
    if (verbose) {
        process.stdout.write(`Starting CSV processing for input: ${inputFilePath}, output: ${outputFilePath}\n`);
    }

    try {
        await fs.unlink(outputFilePath);
        if (verbose) {
            process.stdout.write(`Deleted existing output file: ${outputFilePath}\n`);
        }
    } catch (error: any) {
        if (error.code !== 'ENOENT') { // Ignore "file not found" error
            process.stdout.write(`Error deleting output file ${outputFilePath}: ${error}\n`);
            throw error; // Re-throw other errors
        } else {
            if (verbose) {
                process.stdout.write(`Output file ${outputFilePath} does not exist, creating new file.\n`);
            }
        }
    }

    let rows: InputRow[] = [];
    const rateLimiter = createRateLimiter(maxRequestsPerMinute, minWaitBetweenBatches);
    const processingPromises: Promise<void>[] = [];
    let totalRowsInFile = 0;
    let processedRowsCount = 0;
    let totalBatches = 0;
    let startTime: number; // To track the start time of processing
    let estimatedTotalTime = "calculating...";

    // First pass to count total rows
    if (verbose) {
        process.stdout.write(`First pass: Counting total rows in ${inputFilePath}...\n`);
    }
    await new Promise<void>((resolveCount, rejectCount) => {
        let count = 0;
        createReadStream(inputFilePath)
            .pipe(parse({ headers: true }))
            .on('data', () => count++)
            .on('end', () => {
                totalRowsInFile = count;
                totalBatches = Math.ceil(totalRowsInFile / batchSize);
                if (verbose) {
                    process.stdout.write(`Total rows found: ${totalRowsInFile}, calculated batches: ${totalBatches}\n`);
                }

                if (maxRequestsPerMinute > 0) {
                    const estimatedMinutes = totalBatches / maxRequestsPerMinute;
                    estimatedTotalTime = `${estimatedMinutes.toFixed(1)} minutes`;
                } else if (minWaitBetweenBatches > 0) {
                    const estimatedSeconds = (totalBatches * minWaitBetweenBatches) / 1000;
                    estimatedTotalTime = `${estimatedSeconds.toFixed(1)} seconds`;
                } else {
                    estimatedTotalTime = "very fast (no rate limit)";
                }

                onProgress(0, totalRowsInFile, totalBatches, estimatedTotalTime, "calculating..."); // Initial progress update
                resolveCount();
            })
            .on('error', error => {
                process.stdout.write(`Error counting rows: ${error}\n`);
                rejectCount(error);
            });
    });

    if (verbose) {
        process.stdout.write(`Starting main CSV processing stream...\n`);
    }

    return new Promise((resolve, reject) => {
        startTime = Date.now(); // Record start time after initial row count
        const readStream = createReadStream(inputFilePath);
        const writeStream = createWriteStream(outputFilePath);

        // Write headers immediately
        const headers = ["id", "job_title", "job_function", "job_seniority", "standardized_job_title", "confidence"];
        writeStream.write(headers.join(',') + '\n');
        if (verbose) {
            process.stdout.write(`Writing CSV headers to ${outputFilePath}\n`);
        }

        writeStream.on('finish', () => {
            resolve();
        });

        writeStream.on('error', (error) => {
            process.stdout.write(`Write Stream Error: ${error}\n`);
            reject(error);
        });

        const csvStream = parse({ headers: true })
            .on('error', error => {
                process.stdout.write(`CSV Stream Error: ${error}\n`);
                reject(error);
            })
            .on('data', (row: InputRow) => {
                rows.push(row);
                if (rows.length >= batchSize) {
                    if (verbose) {
                        process.stdout.write(`Batch size (${batchSize}) reached, processing batch.\n`);
                    }
                    processingPromises.push(processBatch());
                }
            })
            .on('end', async () => {
                if (rows.length > 0) {
                    if (verbose) {
                        process.stdout.write(`End of file reached, processing remaining ${rows.length} rows.\n`);
                    }
                    processingPromises.push(processBatch());
                } else {
                    if (verbose) {
                        process.stdout.write(`End of file reached, no remaining rows to process.\n`);
                    }
                }

                if (verbose) {
                    process.stdout.write(`Waiting for all batches to complete...\n`);
                }
                await Promise.all(processingPromises);
                if (verbose) {
                    process.stdout.write(`All batches processed. Closing write stream.\n`);
                }

                writeStream.end(); // Signal that no more data will be written
            });

        const processBatch = async () => {
            if (rows.length === 0) return;

            const currentBatch = [...rows];
            rows = [];

            try {
                if (verbose) {
                    process.stdout.write(`Processing batch of ${currentBatch.length} job titles...\n`);
                }
                const classifications = await rateLimiter(() => classifyJobTitles(currentBatch));
                if (verbose) {
                    process.stdout.write(`Received ${classifications ? classifications.length : 0} classifications for batch.\n`);
                }

                if (classifications && classifications.length > 0) {
                    for (let i = 0; i < currentBatch.length; i++) {
                        const originalRow = currentBatch[i];
                        const classification = classifications[i];

                        if (classification && classification.id === originalRow.id) {
                            const standardizedTitle = getStandardizedJobTitle(
                                classification.jobSeniority,
                                classification.jobFunction,
                                originalRow.prhDecisionMakerJobTitle
                            );

                            const outputRow: OutputRow = {
                                id: originalRow.id,
                                job_title: originalRow.job_title,
                                job_function: classification.jobFunction,
                                job_seniority: classification.jobSeniority,
                                standardized_job_title: standardizedTitle || "N/A",
                                confidence: classification.confidence,
                            };
                            const line = `${outputRow.id},"${outputRow.job_title}",${outputRow.job_function},${outputRow.job_seniority},"${outputRow.standardized_job_title}",${outputRow.confidence}`;
                            writeStream.write(line + '\n');
                            if (verbose) {
                                process.stdout.write(`Processed row ${originalRow.id}: ${originalRow.job_title} -> ${standardizedTitle}\n`);
                            }
                        } else {
                            if (verbose) {
                                const reason = classification ? `ID mismatch (expected ${originalRow.id}, got ${classification.id})` : "classification failed";
                                process.stdout.write(`Classification error for row with id: "${originalRow.id}" (${reason}). Writing error row.\n`);
                            }
                            const errorOutputRow: OutputRow = {
                                id: originalRow.id,
                                job_title: originalRow.job_title,
                                job_function: "Error",
                                job_seniority: "Error",
                                standardized_job_title: "Error",
                                confidence: 0,
                            };
                            const line = `${errorOutputRow.id},"${errorOutputRow.job_title}",${errorOutputRow.job_function},${errorOutputRow.job_seniority},"${errorOutputRow.standardized_job_title}",${errorOutputRow.confidence}`;
                            writeStream.write(line + '\n');
                        }
                    }
                } else {
                    if (verbose) {
                        process.stdout.write("Entire batch classification failed or returned no data. Writing original rows with error status.\n");
                    }
                    currentBatch.forEach(originalRow => {
                        const errorOutputRow: OutputRow = {
                            id: originalRow.id,
                            job_title: originalRow.job_title,
                            job_function: "Error",
                            job_seniority: "Error",
                            standardized_job_title: "Error",
                            confidence: 0,
                        };
                        const line = `${errorOutputRow.id},"${errorOutputRow.job_title}",${errorOutputRow.job_function},${errorOutputRow.job_seniority},"${errorOutputRow.standardized_job_title}",${errorOutputRow.confidence}`;
                        writeStream.write(line + '\n');
                    });
                }
            } catch (error) {
                if (verbose) {
                    process.stdout.write(`Error during batch processing: ${error}. Writing original rows with error status.\n`);
                }
                currentBatch.forEach(originalRow => {
                    const errorOutputRow: OutputRow = {
                        id: originalRow.id,
                        job_title: originalRow.job_title,
                        job_function: "Error",
                        job_seniority: "Error",
                        standardized_job_title: "Error",
                        confidence: 0,
                    };
                    const line = `${errorOutputRow.id},"${errorOutputRow.job_title}",${errorOutputRow.job_function},${errorOutputRow.job_seniority},"${errorOutputRow.standardized_job_title}",${errorOutputRow.confidence}`;
                    writeStream.write(line + '\n');
                });
            } finally {
                processedRowsCount += currentBatch.length;
                if (verbose) {
                    process.stdout.write(`Processed ${currentBatch.length} rows. Total processed: ${processedRowsCount}/${totalRowsInFile}\n`);
                }

                const elapsedTime = Date.now() - startTime;
                const batchesProcessed = processedRowsCount / batchSize;
                let estimatedRemainingTime = "calculating...";

                if (batchesProcessed > 0) {
                    const timePerBatch = elapsedTime / batchesProcessed;
                    const remainingBatches = totalBatches - batchesProcessed;
                    const estimatedRemainingMs = remainingBatches * timePerBatch;

                    const seconds = Math.floor(estimatedRemainingMs / 1000);
                    const minutes = Math.floor(seconds / 60);
                    const hours = Math.floor(minutes / 60);

                    if (hours > 0) {
                        estimatedRemainingTime = `${hours}h ${minutes % 60}m ${seconds % 60}s remaining`;
                    } else if (minutes > 0) {
                        estimatedRemainingTime = `${minutes}m ${seconds % 60}s remaining`;
                    } else {
                        estimatedRemainingTime = `${seconds}s remaining`;
                    }
                }

                onProgress(processedRowsCount, totalRowsInFile, totalBatches, estimatedTotalTime, estimatedRemainingTime);
            }
        };

        readStream.pipe(csvStream);
    });
}