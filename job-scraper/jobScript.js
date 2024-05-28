const { chromium } = require('playwright');
const { PDFDocument, StandardFonts } = require('pdf-lib');
const fs = require('fs');

async function scrapeJobs(keyword, location) {
  const browser = await chromium.launch({headless: false});
  const page = await browser.newPage();

  // Construct the URL based on the user input
  const url = `https://www.indeed.com/jobs?q=${encodeURIComponent(keyword)}&l=${encodeURIComponent(location)}`;

  await page.goto(url);

  // Increase the timeout
  await page.waitForTimeout(5000); // Wait for 5 seconds before checking for the selector

  // Check for the correct selector
  await page.waitForSelector('.slider_item', { timeout: 60000 });

// Scrape job links
const jobLinks = await page.evaluate(async () => {
  const jobCards = document.querySelectorAll('.slider_item'); // Update the selector based on your inspection
  const links = [];
  for (let i = 0; i < jobCards.length && i < 20; i++) {
    jobCards[i].scrollIntoView();
    jobCards[i].click();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for the job details to load
    const linkElement = jobCards[i].querySelector('a.jcs-JobTitle');
    const link = linkElement ? linkElement.href : 'N/A';
    links.push(link);
  }
  return links;
});

  await browser.close();
  
  // Write data to PDF
  await writeLinksToPDF(jobLinks, keyword, location);
}

async function writeLinksToPDF(links, keyword, location) {
  const pdfDoc = await PDFDocument.create();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  let page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const fontSize = 12;
  let yPosition = height - 20;

  // Add title
  page.drawText(`Top 20 Job Links for "${keyword}" in "${location}"`, {
    x: 50,
    y: yPosition,
    size: fontSize,
    font: timesRomanFont,
  });

  yPosition -= 40;

  // Add job links
  links.forEach(link => {
    if (yPosition < 50) {
      // Add new page if space is running out
      page = pdfDoc.addPage();
      yPosition = height - 20;
    }

    page.drawText(link, {
      x: 40,
      y: yPosition,
      size: fontSize,
      font: timesRomanFont,
    });

    yPosition -= (fontSize + 20); // Adjust for spacing
  });

  // Serialize the PDFDocument to bytes (a Uint8Array)
  const pdfBytes = await pdfDoc.save();

  // Write the PDF to a file
  fs.writeFileSync('job_links.pdf', pdfBytes);
}


scrapeJobs('Software Engineer', 'North Carolina')
