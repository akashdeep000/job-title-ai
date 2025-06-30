import { parse, write } from 'fast-csv';
import fs from 'fs';

// Get input and output file paths from command line arguments
const args = process.argv.slice(2);
let inputFile = 'output.csv'; // Default input file
let outputFile = 'sorted_output.csv'; // Default output file

for (let i = 0; i < args.length; i += 2) {
  if (args[i] === '--input' && args[i + 1]) {
    inputFile = args[i + 1];
  } else if (args[i] === '--output' && args[i + 1]) {
    outputFile = args[i + 1];
  }
}

const rows = [];

fs.createReadStream(inputFile)
  .pipe(parse({ headers: true, strictQuotes: false, ignoreEmpty: true }))
  .on('data', (row) => {
    row.confidence = parseFloat(row.confidence);
    rows.push(row);
  })
  .on('end', () => {
    rows.sort((a, b) => b.confidence - a.confidence);

    const ws = fs.createWriteStream(outputFile);
    write(rows, { headers: true }).pipe(ws);

    console.log(`Sorted data written to ${outputFile}`);
  })
  .on('error', (err) => {
    console.error('Error processing CSV:', err);
  });
