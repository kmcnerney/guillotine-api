const express = require('express');
const { Builder, By, Key, until } = require('selenium-webdriver');

// Create an Express app
const app = express();
const port = process.env.PORT || 3000;

async function getLiveProjections() {
  const driver = new Builder()
    .forBrowser('chrome')
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

app.get('/live-projections', async (req, res) => {
  try {
    await getLiveProjections();

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