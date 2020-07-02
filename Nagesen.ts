import RPA from 'ts-rpa';
import { By, WebElement } from 'selenium-webdriver';
const fs = require('fs');
const moment = require('moment');

const Today = moment().format('YYYY-MM-DD');
RPA.Logger.info(Today);

// 本番用
// const Slack_Token = process.env.ABEMA_Hollywood_bot_token;
// const Slack_Channel = process.env.RPA_Test_Channel;

// テスト用
const Slack_Token = process.env.Test_Slack_Token;
const Slack_Channel = process.env.Test_Slack_Channel;

let Slack_Text = ``;

const Tableau_URL3 = process.env.Spot_Tablaeu_Login_URL3;
const CsvDownloader_URL = process.env.Spot_CsvDownloader_URL;
const WorkingName = '投げ銭戦略カレンダー';

async function Start() {
  try {
    // デバッグログを最小限(INFOのみ)にする ※[DEBUG]が非表示になる
    // RPA.Logger.level = 'INFO';
    // 実行前にダウンロードフォルダを全て削除する
    await RPA.File.rimraf({ dirPath: `${process.env.WORKSPACE_DIR}` });
    await CASSO_LOGIN_function();
    await Tabluea_Ope_function();
    await Download_function();
    await Rename_function();
    await SlackFilePost_function(Slack_Text);
    await RPA.sleep(2000);
    RPA.Logger.info(`【ハリウッド】${WorkingName}完了しました`);
  } catch (error) {
    // const DOM = await RPA.WebBrowser.driver.getPageSource();
    // await RPA.Logger.info(DOM);
    await RPA.SystemLogger.error(error);
    Slack_Text = `【ハリウッド】でエラーが発生しました\n${error}`;
    await RPA.WebBrowser.takeScreenshot();
    await SlackFilePost_function(Slack_Text);
  }
  await RPA.WebBrowser.quit();
  await RPA.sleep(1000);
  await process.exit();
}

Start();

async function CASSO_LOGIN_function() {
  await RPA.WebBrowser.get(Tableau_URL3);
  const idinput = await RPA.WebBrowser.wait(
    RPA.WebBrowser.Until.elementLocated({ id: 'username' }),
    15000
  );
  await RPA.WebBrowser.sendKeys(idinput, [process.env.CyNumber]);
  const PW_input = await RPA.WebBrowser.findElementById(`password`);
  await RPA.WebBrowser.sendKeys(PW_input, [process.env.CyPass]);
  const NextButton = await RPA.WebBrowser.findElementByCSSSelector(
    `body > div > div.ping-body-container > div > form > div.ping-buttons > a`
  );
  await RPA.WebBrowser.mouseClick(NextButton);
  await RPA.sleep(2000);
  // タブロー操作用のフレームに切り替え
  const Ifream = await RPA.WebBrowser.wait(
    RPA.WebBrowser.Until.elementLocated({
      css: '#viz > iframe'
    }),
    10000
  );
  await RPA.WebBrowser.switchToFrame(Ifream);
  await RPA.sleep(1000);
}

let StartDate;
let EndDate;
async function Tabluea_Ope_function() {
  /*
  // 更新ボタンを一旦停止
  const StopButton = await RPA.WebBrowser.findElementById(
    `updates-ToolbarButton`
  );
  await RPA.WebBrowser.mouseClick(StopButton);
  */
  //「日付」をクリック
  const DayButton = await RPA.WebBrowser.wait(
    RPA.WebBrowser.Until.elementLocated({
      id: 'dijit_form_DropDownButton_0'
    }),
    30000
  );
  await DayButton.click();
  await RPA.sleep(1000);
  //「四半期」をクリック
  const Quarter = await RPA.WebBrowser.driver.findElement(By.name(`quarter`));
  await Quarter.click();
  await RPA.sleep(3000);
  //「四半期」の日付を取得
  const QuarterDate: WebElement = await RPA.WebBrowser.driver.executeScript(
    `return document.getElementsByClassName('preview')[0].children[0]`
  );
  const QuarterDateText = await QuarterDate.getText();
  RPA.Logger.info(QuarterDateText);
  var Split = await QuarterDateText.split(/\s+/);
  StartDate = `start_date=${Split[0]}`;
  EndDate = `end_date=${Split[2]}`;
  await DayButton.click();
  await RPA.sleep(1000);
  const RefreshButton = await RPA.WebBrowser.findElementById(
    `refresh-ToolbarButton`
  );
  await RPA.WebBrowser.mouseClick(RefreshButton);
  await RPA.sleep(3000);
  // 一度タブローのキャンバスをクリックする
  const CanvasElement: WebElement = await RPA.WebBrowser.driver.executeScript(
    `return document.getElementsByClassName('tab-clip')[0].children[1].children[0]`
  );
  await CanvasElement.click();
  await RPA.sleep(3000);
  // タブローが更新されていない場合は終了させる
  if ((await CanvasElement.isDisplayed()) == false) {
    await RPA.Logger.info(
      `【タブロー】${WorkingName}更新されていません.RPA停止します`
    );
    await RPA.WebBrowser.quit();
    await RPA.sleep(1000);
    process.exit(0);
  }
}

async function Download_function() {
  RPA.Logger.info(`CSVダウンロード開始します`);
  await RPA.WebBrowser.get(CsvDownloader_URL);
  await RPA.sleep(2000);
  const LoginId = await RPA.WebBrowser.wait(
    RPA.WebBrowser.Until.elementLocated({
      id: `exampleInputEmail1`
    }),
    10000
  );
  await RPA.WebBrowser.sendKeys(LoginId, [process.env.CdId]);
  const LoginPw = await RPA.WebBrowser.findElementById(`exampleInputPassword1`);
  await RPA.WebBrowser.sendKeys(LoginPw, [process.env.CdPw]);
  const TableauUrl = await RPA.WebBrowser.findElementById(`exampleInputURL`);
  await RPA.WebBrowser.sendKeys(TableauUrl, [Tableau_URL3]);
  const Parameter = await RPA.WebBrowser.findElementById(
    `exampleFormControlTextarea1`
  );
  await RPA.WebBrowser.sendKeys(Parameter, [StartDate]);
  await RPA.WebBrowser.sendKeys(Parameter, [RPA.WebBrowser.Key.ENTER]);
  await RPA.WebBrowser.sendKeys(Parameter, [EndDate]);
  const DLButton = await RPA.WebBrowser.findElementByClassName(
    `btn btn-primary`
  );
  await DLButton.click();
  await RPA.sleep(5000);
  RPA.Logger.info(`【タブロー】ダウンロード完了`);
}

async function Rename_function() {
  const FileList = await RPA.File.list();
  RPA.Logger.info(FileList);
  for (let i in FileList) {
    if (FileList[i].includes('.csv') == true) {
      await RPA.File.rename({
        old: FileList[i],
        new: `${WorkingName}${Today}.csv`
      });
      RPA.Logger.info('【CSV】リネーム完了');
      break;
    }
  }
}

async function SlackFilePost_function(Slack_Text) {
  await RPA.Slack.files.upload({
    token: Slack_Token,
    // s が付いていないと効かない
    // channel: Slack_Channel,
    channels: Slack_Channel,
    text: `${Slack_Text}`,
    file: fs.createReadStream(__dirname + `/DL/${WorkingName}${Today}.csv`)
  });
}
