# Job Title AI Tool

## What is this tool?

This tool helps you clean up and standardize job titles using Artificial Intelligence. If you have a list of job titles that are messy or inconsistent, this tool can make them uniform and easier to understand.

Think of it like having a smart assistant that takes all your different ways of writing job titles (e.g., "Software Dev", "Sr. Software Engineer", "Software Engineer III") and turns them into a consistent format (e.g., "Software Engineer").

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
        sudo apt install nodejs npm
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

Once you are inside the `job-title-ai` folder in your Terminal/Command Prompt, you need to install some additional parts the tool needs to run.

Type the following command and press Enter:
```bash
npm install
```
This might take a few moments.

## How to Use It (Simple Steps)

Now that everything is set up, here's how to use the tool:

### Step 1: Prepare Your Job Titles

You need your job titles in a file called `sample.csv`. This file should be a simple spreadsheet file where one of the columns contains the job titles you want to clean.

**Important:** Make sure your `sample.csv` file is in the same folder as this tool.

### Step 2: Run the Tool

1.  **Open your computer's Terminal or Command Prompt.**
    *   On Windows, search for "Command Prompt" or "PowerShell".
    *   On Mac/Linux, search for "Terminal".
2.  **Navigate to the tool's folder.** If you followed the setup, you should already be there. If not, use a command like `cd /path/to/job-title-ai` (replace `/path/to/job-title-ai` with the actual location where you saved this tool on your computer).
3.  **Run the command:**

    You need to provide your Google Gemini API Key to the tool. This key allows the tool to use the AI. Replace `YOUR_GEMINI_API_KEY_HERE` with your actual key.

    ```bash
    GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE" npm start --input sample.csv --output output.csv --batchSize 10 --maxRequestsPerMinute 15
    ```

    Let's break down this command:
    *   `GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"`: This tells the tool your secret key for the AI. **Important: Replace `YOUR_GEMINI_API_KEY_HERE` with your actual key.**
    *   `npm start`: This is the main command to run the tool.
    *   `--input sample.csv`: This tells the tool that your job titles are in a file named `sample.csv`.
    *   `--output output.csv`: This tells the tool to save the cleaned job titles to a new file named `output.csv`.
    *   `--batchSize 10`: This means the tool will send 10 job titles at a time to the AI for cleaning. You can change this number.
    *   `--maxRequestsPerMinute 15`: This limits how many times the tool talks to the AI in a minute (15 times). This helps avoid hitting limits. You can change this number.

    (If `npm start` doesn't work, you might try `pnpm start` or `yarn start` if you have those installed, but remember to include the `GEMINI_API_KEY` and other arguments.)

### Step 3: Get Your Cleaned Titles

After the tool finishes running, it will create a new file called `output.csv` in the same folder. This `output.csv` file will contain your original data along with a new column showing the cleaned and standardized job titles.

## What You Get

The `output.csv` file will have:
*   All the original information from your `sample.csv` file.
*   An added column with the AI-cleaned job titles, making them consistent and easy to use for analysis or other purposes.

## Troubleshooting (Basic Tips)

*   **"Command not found" error when running `npm start`?**
    *   You might need to install Node.js first. Search online for "install Node.js" for instructions.
    *   Try `pnpm start` or `yarn start` instead if you have those installed.
*   **`output.csv` not created?**
    *   Make sure your `sample.csv` file is correctly placed in the same folder as the tool.
    *   Check if there were any error messages in the Terminal/Command Prompt when you ran the tool.
*   **Job titles don't look right?**
    *   The AI does its best, but sometimes very unusual job titles might not be perfectly standardized. You might need to manually adjust a few if they are very unique.

If you have any questions, feel free to ask someone more technical for help!