function getStandardizedJobTitle(jobSeniority: string, jobFunction: string, jobTitle: string | null = null) {
    const seniority = jobSeniority.toLowerCase();
    const func = jobFunction.toLowerCase();
    const title = jobTitle ? jobTitle.toLowerCase() : null;

    if (title === "toimitusjohtaja") return "Chief Executive Officer";
    if (["founder", "managing director", "entrepreneur", "chairman of the board", "ceo"].includes(seniority)) return "Executive Decision Maker";
    if (title === "executive decision maker") return "Executive Decision Maker";
    if (func === "other commercial") return "Other Commercial";
    if (func === "other") return "Other";
    if (seniority === "chief") return `Chief ${capitalize(func)} Officer`;
    if (seniority === "president") return `President of ${capitalize(func)}`;
    if (seniority === "vice president") return `Vice President of ${capitalize(func)}`;
    if (seniority === "director") return `${capitalize(func)} Director`;
    if (seniority === "head of") return `Head of ${capitalize(func)}`;
    if (seniority === "manager") return `${capitalize(func)} Manager`;
    if (seniority === "lead") return `${capitalize(func)} Lead`;

    return `${capitalize(func)} Other`;
}

function capitalize(str: string) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export { capitalize, getStandardizedJobTitle };
