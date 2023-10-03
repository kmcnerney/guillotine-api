const express = require('express')
const cors = require('cors')

const { Builder, By, Key, until } = require('selenium-webdriver')
require('chromedriver')
const chrome = require('selenium-webdriver/chrome')

let chromeOptions = new chrome.Options()
chromeOptions.setChromeBinaryPath(process.env.CHROME_BINARY_PATH)
let serviceBuilder = new chrome.ServiceBuilder(process.env.CHROME_DRIVER_PATH)

chromeOptions.addArguments("--headless")
chromeOptions.addArguments("--disable-gpu")
chromeOptions.addArguments("--no-sandbox")

const app = express()
const port = process.env.PORT || 3001
app.use(cors())

const RETRY_DELAY = 10 * 1000 // 10 seconds

let driver
async function login() {
  try {
    driver = new Builder()
      .forBrowser('chrome')
      .setChromeOptions(chromeOptions)
      .setChromeService(serviceBuilder)
      .build()

    await driver.get('https://football.fantasysports.yahoo.com/f1/338574')

    await driver.wait(until.elementLocated(By.id('login-username')), 5000)
    await driver.findElement(By.id('login-username')).sendKeys('mcnerney_kevin')
    await driver.findElement(By.id('login-signin')).click()
    
    await driver.wait(until.elementLocated(By.id('login-passwd')), 5000)
    await driver.findElement(By.id('login-passwd')).sendKeys('GuillotineEasy1!')
    await driver.findElement(By.id('login-signin')).click()

    await driver.wait(until.elementLocated(By.tagName('body')), 5000)
    console.log('Logged into Yahoo')
  } catch (e) {
    console.error('Failed to login to Yahoo', e)
    await new Promise(r => setTimeout(r, RETRY_DELAY))
    await driver.quit()
    login()
  }
}

// const _scraper = () => {
//   console.log('running script')
//   const weeklySection = document.getElementById('matchupweek')
//   const leagueTable = weeklySection.getElementsByClassName('Table')
//   const leagueTableBody = leagueTable[0].getElementsByTagName('tbody')
//   const teams = leagueTableBody[0].getElementsByTagName('tr')

//   let scores = []
//   for(const team of teams) {
//     const cells = team.getElementsByTagName('td')
//     const teamName = cells[2].getElementsByTagName('a')[0].innerHTML
//     const projScore = cells[4].innerHTML
//     scores.push({
//       teamName: teamName,
//       projectedPts: projScore
//     })
//   }
//   return scores
// }

async function getLiveProjections() {
  let scores = []
  try {
    // scores = await driver.executeScript(_scraper)

    const pageSource = await driver.wait(until.elementLocated(By.tagName('body')), 5000).getAttribute('innerHTML');
    console.log('pageSource: ', pageSource);

    await driver.wait(until.elementLocated(By.id('matchupweek')), 5000)
    const weeklySection = await driver.findElement(By.id('matchupweek'))
    const leagueTable = await weeklySection.findElements(By.className('Table'))
    const leagueTableBody = await leagueTable[0].findElements(By.tagName('tbody'))
    const teams = await leagueTableBody[0].findElements(By.tagName('tr'))

    for(const team of teams) {
      const cells = await team.findElements(By.tagName('td'))
      const teamCell = await cells[2].findElements(By.tagName('a'))
      scores.push({
        teamName: await teamCell[0].getAttribute('innerHTML'),
        projectedPts: await cells[3].getAttribute('innerHTML')
      })
    }
  } catch (e) {
    console.error('Failed to get live projections from Yahoo', e)
    await driver.quit()
    login()
    return []
  }

  scores.sort((a, b) => parseFloat(b.projectedPts) - parseFloat(a.projectedPts));
  return scores
}

login()

app.get('/live-projections', async (req, res) => {
  try {
    const results = await getLiveProjections()
    console.log('returning scores', results)
    res.send(results)
  } catch (error) {
    console.error('Failed to get live projections: ', error);
    res.status(500).send('Failed to get live projections');
  }
});

app.get('/re-login', async (req, res) => {
  try {
    const results = await login()
    res.send('Successfully logged into Yahoo')
  } catch (e) {
    console.error('Failed to login: ', e);
    res.status(500).send('Failed to login');
  }
});

app.get('/', async (req, res) => {
  try {
    res.send('Server is healthy');
  } catch (e) {
    console.error('Failed pulse: ', e);
    res.status(500).send('Server is unhealthy!');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});