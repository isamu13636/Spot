import RPA from 'ts-rpa';
import { WebElement } from 'selenium-webdriver';
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

const Tableau_URL = process.env.Spot_Tablaeu_Login_URL;
const WorkingName = 'デモグラコンテンツ分析（アニメ）';
const AdxV4Genre = [
  'アニメ1',
  'アニメ2',
  'アニメ3',
  'アニメ4',
  'アニメ5',
  'アニメ6',
  'アニメ7'
];

let count;
let CurrentGenre;
let FirstLoginFlag = 'true';
async function Start() {
  try {
    // デバッグログを最小限(INFOのみ)にする ※[DEBUG]が非表示になる
    // RPA.Logger.level = 'INFO';
    for (let i in AdxV4Genre) {
      await RPA.File.rimraf({ dirPath: `${process.env.WORKSPACE_DIR}` });
      count = Number(i) + 1;
      CurrentGenre = AdxV4Genre[i];
      if (FirstLoginFlag == 'true') {
        await CASSO_LOGIN_function();
        await Tabluea_Ope_function();
        await AdxV4Genre_function();
      }
      if (FirstLoginFlag == 'false') {
        RPA.Logger.info(`＊＊＊ログインをスキップしました＊＊＊`);
        await AdxV4Genre_function();
      }
      // 一度ログインしたら、以降はログインページをスキップ
      FirstLoginFlag = 'false';
      await Download_function();
      await Rename_function();
      await SlackFilePost_function(Slack_Text);
      await RPA.sleep(2000);
    }
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
  await RPA.WebBrowser.get(Tableau_URL);
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

let All;
let Check;
let ClickElement;
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
      className: 'tabComboBoxButtonHolder'
    }),
    30000
  );
  await RPA.WebBrowser.mouseClick(DayButton);
  await RPA.sleep(1000);
  //「すべて」にチェック
  All = await RPA.WebBrowser.findElementByClassName('FICheckRadio');
  await RPA.WebBrowser.mouseClick(All);
  // 6秒で安定
  await RPA.sleep(6000);
  ClickElement = await RPA.WebBrowser.findElementByClassName(
    `tab-glass clear-glass tab-widget`
  );
  await RPA.WebBrowser.mouseClick(ClickElement);
  await RPA.sleep(1000);
  //「AdxV4課金ステータス」をクリック
  const AdxV4KakinStatusButton = await RPA.WebBrowser.findElementsByClassName(`
  tabComboBoxButtonHolder`);
  await AdxV4KakinStatusButton[3].click();
  await RPA.sleep(1000);
  All = await RPA.WebBrowser.findElementByClassName('FICheckRadio');
  await All.click();
  await RPA.sleep(3000);
  // 該当ステータスにチェック
  const AdxV4KakinStatusList = await RPA.WebBrowser.findElementsByClassName(
    `FIItem`
  );
  Check = await RPA.WebBrowser.findElementsByClassName('FICheckRadio');
  for (let i in AdxV4KakinStatusList) {
    const Text = await AdxV4KakinStatusList[i].getText();
    if (Text == 'トライアル' || Text == '課金継続') {
      await Check[i].click();
      RPA.Logger.info(Text + ': チェックしました');
    }
  }
  await RPA.sleep(6000);
  ClickElement = await RPA.WebBrowser.findElementByClassName(
    `tab-glass clear-glass tab-widget`
  );
  await RPA.WebBrowser.mouseClick(ClickElement);
  await RPA.sleep(1000);
  //「ジャンルID」をクリック
  const GenreIDButton = await RPA.WebBrowser.findElementsByClassName(`
  tabComboBoxButtonHolder`);
  await GenreIDButton[1].click();
  await RPA.sleep(1000);
  All = await RPA.WebBrowser.findElementByClassName('FICheckRadio');
  await All.click();
  await RPA.sleep(3000);
  // 該当ステータスにチェック
  const GenreIDList = await RPA.WebBrowser.findElementsByClassName(`FIItem`);
  Check = await RPA.WebBrowser.findElementsByClassName('FICheckRadio');
  for (let i in GenreIDList) {
    const Text = await GenreIDList[i].getText();
    if (Text == 'movie' || Text == 'drama') {
      await Check[i].click();
      RPA.Logger.info(Text + ': チェックしました');
    }
  }
  await RPA.sleep(6000);
  ClickElement = await RPA.WebBrowser.findElementByClassName(
    `tab-glass clear-glass tab-widget`
  );
  await RPA.WebBrowser.mouseClick(ClickElement);
}

let CheckFlag = `true`;
let IflameFlag = `true`;
async function AdxV4Genre_function() {
  if (IflameFlag == `false`) {
    const Ifream = await RPA.WebBrowser.findElementByCSSSelector(
      '#viz > iframe'
    );
    await RPA.WebBrowser.switchToFrame(Ifream);
    await RPA.sleep(1000);
  }
  IflameFlag = `false`;
  //「AdxV4ジャンル」をクリック
  const AdxV4GenreButton = await RPA.WebBrowser.findElementsByClassName(`
  tabComboBoxButtonHolder`);
  await AdxV4GenreButton[4].click();
  await RPA.sleep(1000);
  //「すべて」をクリック
  All = await RPA.WebBrowser.findElementByClassName('FICheckRadio');
  await All.click();
  // 3秒で安定
  await RPA.sleep(3000);
  if (CheckFlag == `false`) {
    All = await RPA.WebBrowser.findElementByClassName('FICheckRadio');
    await All.click();
    await RPA.sleep(3000);
  }
  // 以降は常に一度「すべて」にチェックして再度チェックを外す
  CheckFlag = `false`;
  // 該当ジャンルにチェック
  const AdxV4GenreList = await RPA.WebBrowser.findElementsByClassName(`FIItem`);
  Check = await RPA.WebBrowser.findElementsByClassName('FICheckRadio');
  for (let i in AdxV4GenreList) {
    const Text = await AdxV4GenreList[i].getText();
    if (Text == CurrentGenre) {
      await Check[i].click();
      RPA.Logger.info(Text + ': チェックしました');
      break;
    }
  }
  await RPA.sleep(6000);
  ClickElement = await RPA.WebBrowser.findElementByClassName(
    `tab-glass clear-glass tab-widget`
  );
  await RPA.WebBrowser.mouseClick(ClickElement);
  await RPA.sleep(1000);
  const RefreshButton = await RPA.WebBrowser.findElementById(
    `refresh-ToolbarButton`
  );
  await RPA.WebBrowser.mouseClick(RefreshButton);
  await RPA.sleep(3000);
  // 一度タブローのキャンバスをクリックする
  const CanvasElement: WebElement = await RPA.WebBrowser.driver.executeScript(
    `return document.getElementById('tabZoneId232').children[0].children[0].children[0].children[0].children[1]`
  );
  await CanvasElement.click();
  await RPA.sleep(3000);
  // タブローが更新されていない場合はスキップする
  if ((await CanvasElement.isDisplayed()) == false) {
    await RPA.Logger.info(
      `【タブロー】${WorkingName}更新されていません.スキップします`
    );
    await Start();
  }
}

async function Download_function() {
  RPA.Logger.info(`CSVダウンロード開始します`);
  const DLButton = await RPA.WebBrowser.findElementById(
    `download-ToolbarButton`
  );
  await DLButton.click();
  await RPA.sleep(2000);
  await RPA.WebBrowser.driver.executeScript(
    `document.getElementById('DownloadDialog-Dialog-Body-Id').children[0].children[2].click()`
  );
  await RPA.sleep(1000);
  const WindowHandles = await RPA.WebBrowser.getAllWindowHandles();
  RPA.Logger.info(WindowHandles);
  // ウィンドウが新しく立ち上がるためそこに切り替える
  await RPA.WebBrowser.switchToWindow(WindowHandles[1]);
  await RPA.sleep(300);
  const DownloadLink = await RPA.WebBrowser.wait(
    RPA.WebBrowser.Until.elementLocated({
      className: 'csvLink_summary'
    }),
    15000
  );
  await RPA.WebBrowser.mouseClick(DownloadLink);
  await RPA.sleep(5000);
  RPA.Logger.info(`【タブロー】ダウンロード完了`);
  // 現在のウィンドウを閉じて元のウィンドウに切り替える
  await RPA.WebBrowser.driver.close();
  await RPA.WebBrowser.switchToWindow(WindowHandles[0]);
}

async function Rename_function() {
  const FileList = await RPA.File.list();
  RPA.Logger.info(FileList);
  for (let i in FileList) {
    if (FileList[i].includes('.csv') == true) {
      await RPA.File.rename({
        old: FileList[i],
        new: `${WorkingName}${Today}_${count}.csv`
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
    file: fs.createReadStream(
      __dirname + `/DL/${WorkingName}${Today}_${count}.csv`
    )
  });
}
