const express = require('express');
// const { Builder, By, Key, until } = require('selenium-webdriver');
// require('chromedriver');
// const chrome = require('selenium-webdriver/chrome');

// let options = new chrome.Options();
// options.setChromeBinaryPath(process.env.CHROME_BINARY_PATH);
// let serviceBuilder = new chrome.ServiceBuilder(process.env.CHROME_DRIVER_PATH);

//Don't forget to add these for heroku
// options.addArguments("--headless");
// options.addArguments("--disable-gpu");
// options.addArguments("--no-sandbox");


const app = express();
const port = 3000;

async function getLiveProjections() {
  let driver = new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .setChromeService(serviceBuilder)
    .build();

  try {
    // Navigate to the Yahoo Fantasy login page
    await driver.get('https://login.yahoo.com');

    // Find the username input field and enter your Yahoo username/email
    await driver.findElement(By.id('login-username')).sendKeys('your_username');

    // Find and click the "Next" button (Yahoo sometimes requires two steps for login)
    await driver.findElement(By.id('login-signin')).click();

    // Wait for the password input field to become visible
    await driver.wait(until.elementLocated(By.id('login-passwd')), 5000);

    // Find the password input field and enter your password
    await driver.findElement(By.id('login-passwd')).sendKeys('your_password');

    // Find and click the "Sign In" button
    await driver.findElement(By.id('login-signin')).click();

    // Optional: Add code to handle post-login actions on the Yahoo Fantasy site
    // ...

    console.log('Login successful.');
  } finally {
    // Close the browser window
    await driver.quit();
  }
}

app.get('/', async (req, res) => {
  try {
    res.send('Server is healthy');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Server is unhealthy!');
  }
});

app.get('/live-projections', async (req, res) => {
  try {
    //await getLiveProjections();

    res.send('Selenium actions executed successfully!');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error executing Selenium actions.');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});