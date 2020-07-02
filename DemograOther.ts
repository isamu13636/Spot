import RPA from 'ts-rpa';
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

const Tableau_URL2 = process.env.Spot_Tablaeu_Login_URL2;
const CsvDownloader_URL = process.env.Spot_CsvDownloader_URL;
const WorkingName = 'デモグラコンテンツ分析（アニメ以外）';
const AdxV4Genre = [
  // ['スポーツ'],
  ['K-POP'],
  ['ドラマ1,ドラマ2,ドラマ4,ドラマ5'],
  ['ニュース'],
  ['バラエティ1,バラエティ2,バラエティ3,バラエティ4'],
  ['映画1,映画3'],
  ['格闘'],
  ['韓流・華流'],
  ['将棋'],
  ['麻雀'],
  ['恋リア1,恋リア2'],
  ['すべて']
];

const AdxV4Genre2 = [
  // 'スポーツ',
  'K-POP',
  'ドラマ',
  'ニュース',
  'バラエティ',
  '映画',
  '格闘',
  '韓流',
  '将棋',
  '麻雀',
  '恋リア',
  'すべて'
];

let CurrentGenre;
let CurrentGenre2;
async function Start() {
  try {
    // デバッグログを最小限(INFOのみ)にする ※[DEBUG]が非表示になる
    // RPA.Logger.level = 'INFO';
    for (let i in AdxV4Genre) {
      await RPA.File.rimraf({ dirPath: `${process.env.WORKSPACE_DIR}` });
      CurrentGenre = AdxV4Genre[i];
      CurrentGenre2 = AdxV4Genre2[i];
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
  await RPA.WebBrowser.sendKeys(TableauUrl, [Tableau_URL2]);
  const Parameter = await RPA.WebBrowser.findElementById(
    `exampleFormControlTextarea1`
  );
  if (CurrentGenre[0] != `すべて`) {
    await RPA.WebBrowser.sendKeys(Parameter, [
      `AdxV4ジャンル=${CurrentGenre[0]}`
    ]);
    await RPA.WebBrowser.sendKeys(Parameter, [RPA.WebBrowser.Key.ENTER]);
  }
  await RPA.WebBrowser.sendKeys(Parameter, [
    `Adx課金ステータス=トライアル,課金継続`
  ]);
  await RPA.WebBrowser.sendKeys(Parameter, [RPA.WebBrowser.Key.ENTER]);
  await RPA.WebBrowser.sendKeys(Parameter, [`デバイス=0_ALL`]);
  await RPA.WebBrowser.sendKeys(Parameter, [RPA.WebBrowser.Key.ENTER]);
  await RPA.WebBrowser.sendKeys(Parameter, [`ジャンルID=movie,drama`]);
  const DLButton = await RPA.WebBrowser.findElementByClassName(
    `btn btn-primary`
  );
  await DLButton.click();
  await RPA.sleep(10000);
  RPA.Logger.info(`【タブロー】ダウンロード完了`);
}

async function Rename_function() {
  const FileList = await RPA.File.list();
  RPA.Logger.info(FileList);
  for (let i in FileList) {
    if (FileList[i].includes('.csv') == true) {
      await RPA.File.rename({
        old: FileList[i],
        new: `${WorkingName}${Today}_${CurrentGenre2}.csv`
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
      __dirname + `/DL/${WorkingName}${Today}_${CurrentGenre2}.csv`
    )
  });
}
