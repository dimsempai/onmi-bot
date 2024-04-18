const axios = require("axios");
const { Worker } = require("worker_threads");
const fs = require("fs").promises;
const _fs = require("fs");
const readline = require('readline');

async function getEmails(n = 10) {
  try {
    const response = await axios.get(
      `https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=${n}`
    );
    const data = response.data;
    return data;
  } catch (error) {
    console.error(`error on getting email: ${error}`);
    return [];
  }
}

async function startThread(reff, processCount) {
  const emails = await getEmails(processCount);
  let workerDone = 0;
  for (const email of emails) {
    const workder = new Worker("./worker.js");
    workder.on("message", (message) => {
      if (message.includes("done") || message.includes("Skipping...")) {
        if (!message.includes("done")) {
          console.log(message);
        }
        workerDone++;
        if (workerDone === emails.length) {
          console.log("All workers done. Registering new emails...");

          _fs.readFile('email.json', 'utf8', (err, data) => {
            if (err) {
              console.error('Error reading file:', err);
              return;
            }
            let _emails = JSON.parse(data);

            _emails.push(...emails);
            let updatedData = JSON.stringify(_emails, null, 2);
            _fs.writeFile('email.json', updatedData, 'utf8', (err) => {
              if (err) {
                console.error('Error writing file:', err);
                return;
              }
            });
          });
          return startThread(reff, processCount);
        }
      } else {
        console.log(message);
      }
    });
    workder.postMessage({ email, reff });
  }
}

const numOfCpus = require("os").cpus().length;
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
(async () => {
  rl.question('ketik 1 untuk dafar, ketik 2 untuk valid, ketik 3 jika anda ingin masuk islam: ', async (answer) => {
    if(answer == 1) {
      const reff = "fBBnyb-QuoKQ";
      const processCount = Math.floor(numOfCpus / 2);
      await startThread(reff, processCount);
    }else if (answer == 2) {
      await validos();
    }
    rl.close();
  });


})();


async function getInboxId(email, logger, tryCount = 0) {
  const x = email.split("@");
  const login = x[0];
  const domain = x[1];
  const endpoint = `https://www.1secmail.com/api/v1/?action=getMessages&login=${login}&domain=${domain}`;
  try {
    const response = await axios.get(endpoint);
    if (response.data.length > 0) {
      return response.data[0].id;
    }
    return null;
  } catch (error) {

    return null;
  }
}


async function verifyUser(code) {
  const url = "https://onmi-waitlist.rand.wtf/api/activate";

  const headers = {
    Host: "onmi-waitlist.rand.wtf",
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:124.0) Gecko/20100101 Firefox/124.0",
    Accept: "*/*",
    "Accept-Language": "id,en-US;q=0.7,en;q=0.3",
    "Accept-Encoding": "gzip, deflate, br",
    Referer: "https://onmi.io/",
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": "23",
    Origin: "https://onmi.io",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "cross-site",
    Te: "trailers",
  };

  const payload = {
    code: code,
  };

  try {
    const response = await axios.post(url, payload, { headers });
    return response.data;
  } catch (error) {
    return null;
  }
}

async function getMessage(email, id, tryCount = 0) {
  const x = email.split("@");
  const login = x[0];
  const domain = x[1];
  const endpoint = `https://www.1secmail.com/api/v1/?action=readMessage&login=${login}&domain=${domain}&id=${id}`;
  try {
    const response = await axios.get(endpoint);
    const messageData = response.data;
    if (messageData) {
      return messageData.body;
    }
    return null;
  } catch (error) {

    return null;
  }
}

async function validos() {
  let data = await fs.readFile('email.json', 'utf8');
  let emails = JSON.parse(data);

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i]
    try {
      const eId = await getInboxId(email);
      const message = await getMessage(email, eId);
      const link = message.split('href="')[1].split('"')[0];
      const x = await axios.get(link);
      const code = (x.data.split("?verify_code=")[1]).split('\\"')[0];
    //   const getCode = (message.split('office:word" href="')[1]).split('"')[0];
      // const code = getCode.split("=")[1];
      const response = await verifyUser(code);
      console.log("Email: ", email, " Done!");
    } catch (_) {
      console.log("Email: ", email, " Failed!");

    }
  }

}
