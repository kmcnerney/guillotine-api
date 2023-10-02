const express = require('express')
const { Builder, By, Key, until } = require('selenium-webdriver')
require('chromedriver')
const chrome = require('selenium-webdriver/chrome')

let chromeOptions = new chrome.Options()
chromeOptions.setChromeBinaryPath(process.env.CHROME_BINARY_PATH)
let serviceBuilder = new chrome.ServiceBuilder(process.env.CHROME_DRIVER_PATH)

chromeOptions.addArguments("--headless")
chromeOptions.addArguments("--disable-gpu")
chromeOptions.addArguments("--no-sandbox")

let driver = new Builder()
    .forBrowser('chrome')
    .setChromeOptions(chromeOptions)
    .setChromeService(serviceBuilder)
    .build()

const app = express()
const port = process.env.PORT || 3000

async function login() {
  await driver.get('https://login.yahoo.com');
  await driver.findElement(By.id('login-username')).sendKeys('mcnerney_kevin');
  await driver.findElement(By.id('login-signin')).click();
  
  await driver.wait(until.elementLocated(By.id('login-passwd')), 5000);
  await driver.findElement(By.id('login-passwd')).sendKeys('GuillotineEasy1!');
  await driver.findElement(By.id('login-signin')).click();

  await driver.wait(until.elementLocated(By.id('atomic')), 5000);
  console.log('Logged into Yahoo')
}

const scoreState = {}
async function getLiveProjections() {
  await driver.get('https://football.fantasysports.yahoo.com/f1/338574')
  await driver.wait(until.elementLocated(By.className('Table')), 5000)
  const weeklySection = await driver.findElement(By.id('matchupweek'))
  const leagueTable = await weeklySection.findElement(By.className('Table'))
  const leagueTableBody = await leagueTable.findElements(By.tagName('tbody'))
  const teams = await leagueTableBody[0].findElements(By.tagName('tr'))

  for(const team of teams) {
    const cells = await team.findElements(By.tagName('td'))
    const teamCell = await cells[2].findElement(By.tagName('a'))
    const teamName = await teamCell.getAttribute('innerHTML')
    const projScore = await cells[3].getAttribute('innerHTML')
    scoreState[teamName] = {
      projectedPts: projScore
    }
  }
  console.log('completed this with scoreState', scoreState)
}

login();

app.get('/live-projections', async (req, res) => {
  try {
    await getLiveProjections()
    res.send(scoreState)
  } catch (error) {
    console.error('Failed to get live projections: ', error);
    res.status(500).send('Failed to get live projections');
  }
});

app.get('/', async (req, res) => {
  try {
    res.send('Server is healthy');
  } catch (error) {
    console.error('Failed pulse: ', error);
    res.status(500).send('Server is unhealthy!');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});