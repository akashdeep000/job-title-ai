# Job Title AI Tool

## What is this tool?

This tool helps you clean up and standardize job titles using Artificial Intelligence. If you have a list of job titles that are messy or inconsistent, this tool can make them uniform and easier to understand.

## Setup (First Time Only)

Before you can use the Job Title AI Tool, you need to set up your computer. Don't worry, it's a one-time process!

### Step 1: Install Node.js and npm

This tool uses Node.js, which comes with `npm` (Node Package Manager). If you don't have it, follow these steps:

1.  **Download Node.js:** Go to the official Node.js website: [https://nodejs.org/en/download/](https://nodejs.org/en/download/)
2.  **Install:** Download the recommended version for your operating system and follow the installation instructions. This will also install `npm`.

    *   **For Mac users (using Homebrew):**
        If you have Homebrew installed, you can open your Terminal and run:
        ```bash
        brew install node
        ```
    *   **For Linux users (using apt):**
        Open your Terminal and run:
        ```bash
        sudo apt update
        sudo apt install nodejs
        ```

### Step 2: Get the Tool (Clone the Repository)

This tool's code is stored in a place called a "repository" on the internet. You need to copy it to your computer.

1.  **Install Git (if you don't have it):** Git is a tool used to download code repositories. You can download it from [https://git-scm.com/downloads](https://git-scm.com/downloads). Follow the installation instructions.

    *   **For Mac users (using Homebrew):**
        If you have Homebrew installed, you can open your Terminal and run:
        ```bash
        brew install git
        ```
    *   **For Linux users (using apt):**
        Open your Terminal and run:
        ```bash
        sudo apt update
        sudo apt install git
        ```
2.  **Open your computer's Terminal or Command Prompt.**
    *   On Windows, search for "Command Prompt" or "PowerShell".
    *   On Mac/Linux, search for "Terminal".
3.  **Copy the tool to your computer:** Type the following command and press Enter:
    ```bash
    git clone [REPOSITORY_URL_HERE]
    ```
    **Note:** You'll need to replace `[REPOSITORY_URL_HERE]` with the actual web address of this tool's code. If you don't know it, ask the person who gave you this tool.
4.  **Navigate into the tool's folder:**
    ```bash
    cd job-title-ai
    ```
    (This assumes the folder created by `git clone` is named `job-title-ai`. If it's different, use that name.)

### Step 3: Install Tool Dependencies

Once you are inside the `job-title-ai` folder in your Terminal/Command Prompt, install the dependencies with `npm`:
```bash
npm install
```
This might take a few moments.

After installing dependencies, apply any pending database migrations:
```bash
npm run db:migrate
```
This command updates the database schema to the latest version and is a mandatory step before using the tool.

## How to Use It

The Job Title AI tool is a command-line interface (CLI) application. You interact with it by typing commands in your terminal.

To run a command, use `npm start <command>`.

**Important:** Before running process commands that interact with the AI, ensure you have set your Google Gemini API Key as an environment variable. For example:
```bash
export GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"
# Or, for a single command:
GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE" npm start process
```

Here are the available commands:

### 1. `ingest <file>`

Ingest a CSV file into the database. This command reads your CSV file and stores the job titles in the tool's internal database, preparing them for processing.

*   `<file>`: Path to the CSV file you want to ingest.

**Example:**
```bash
npm start ingest path/to/your/job_titles.csv
```

### 2. `process`

Process job titles using the AI. This command sends the ingested job titles to the AI for standardization and cleaning.

**Options:**

*   `--batchSize` or `-b` (number): Number of job titles to process in each AI batch.
    *   Default: `10`
*   `--requestsPerMinute` or `-rpm` (number): Maximum number of AI requests per minute (for rate limiting).
    *   Default: `60`
*   `--minWaitBetweenBatches` or `-wait` (number): Minimum wait time in milliseconds between AI batches (for rate limiting).
    *   Default: `0` (0 means no minimum wait, RPM will control)

**Note:** You cannot specify both `--requestsPerMinute` and `--minWaitBetweenBatches` simultaneously. Choose one or neither.

**Examples:**
```bash
# Process with default settings
npm start process

# Process 20 job titles per batch
npm start process --batchSize 20
# or
npm start process -b 20

# Limit AI requests to 30 per minute
npm start process --requestsPerMinute 30
# or
npm start process -rpm 30

# Wait at least 1s between batches
npm start process --minWaitBetweenBatches 1
# or
npm start process -wait 1
```

### 3. `export <file>`

Export processed job titles to a CSV file. This command allows you to retrieve the standardized job titles from the database and save them to a new CSV file.

*   `<file>`: Path to the CSV file where you want to save the exported data.

**Options:**

*   `--status` or `-s` (string): Filter by job title status (e.g., `completed`, `pending`, `failed`).
*   `--minConfidence` or `-c` (number): Filter by minimum confidence score (0-1).

**Examples:**
```bash
# Export all processed job titles to output.csv
npm start export output.csv

# Export only completed job titles
npm start export completed_titles.csv --status completed
# or
npm start export -s completed completed_titles.csv

# Export completed job titles with a minimum confidence of 0.8
npm start export high_confidence_titles.csv --status completed --minConfidence 0.8
# or
npm start export -s completed -c 0.8 high_confidence_titles.csv
```

### 4. `reset`

Reset the database. This command clears all data from the tool's internal database, allowing you to start fresh.

**Example:**
```bash
npm start reset
```

### 5. Database Management

These commands are for managing the database schema and viewing its contents.


#### `db:studio`

Open the database studio in your browser. This command launches a web-based interface that allows you to view and interact with the database contents directly.

**Example:**
```bash
npm run db:studio
```