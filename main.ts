const dasha = require('@dasha.ai/platform-sdk');
import DashaSdk, {
  IApplication,
  IJobDescription,
} from "@dasha.ai/platform-sdk";

import { createLogger, recordToUrl, runConsoleChat } from "./helpers";

import csv from "csv-parser";
import { createObjectCsvWriter } from "csv-writer";
import fs from "fs";
import { Guid } from "guid-typescript";
import moment from "moment";
import { start } from "repl";

interface IJobParams extends Record<string, unknown>, IJobDescription {
  phone: string;
}

interface IJobResults extends IJobParams {
  status: string;
  serviceStatus: string;
  recordUrl?: string;
  appId: string;
  instanceId: string;
  clientJobId: string;
  platformJobId: string;
  date: string;
  time: string;
}

interface ObjectCsvWriterParams {
  path: string;
  header: { id: string; title: string }[] | string[];
  fieldDelimiter?: string;
  recordDelimiter?: string;
  headerIdDelimiter?: string;
  alwaysQuote?: boolean;
  encoding?: string;
  append?: boolean;
}

async function writeResults(results: Record<string, IJobResults>) {
  const res = Object.values(results);
  if (res.every(({ status }) => (status?.length ?? 0) > 0)) {
  }
}

async function main() {
  const apiKey = "X3bvnPhhnTy3zT6apbvxYsTsPO9ObcktkjybVOON6U8";
  let sdk = new dasha.DashaSdk(await dasha.accounts.getCurrentAccountInfo());
  let app: IApplication;
  try {
    app = await sdk.registerApp({
      appPackagePath: "./app",
      concurrency: 35,
      progressReporter: dasha.progress.consoleReporter
    });
    app.setLogger(console);
    console.log(`App ${app.applicationId}, instance ${app.instanceId}`);

    await app.addSessionConfig({ name: "text", config: { type: "text" } });
    await app.addSessionConfig({
      name: "audio",
      config: {
        type: "audio",
        channel: {
          type: "sip",
          configName: "range-telecom",
        },
        stt: {
          configName: "Default-en",
        },
        tts: {
          type: "synthesized",
          configName: "Dasha",
        },
      },
    });
    app.onJob({
      startingJob: async (serverId, id, incomingData) => {
        console.log(`Staring job ${id}`, { serverId, ...incomingData });
        console.log(`Initial context`, data[id]);
        if (data[id]?.phone === undefined) {
          return { accept: false }; // reject dead job
        }
        preliminaryResults[id] = {
          ...(data[id] as any),
          status: "",
          serviceStatus: "",
          appId: app.applicationId,
          instanceId: app.instanceId,
          clientJobId: id,
          platformJobId: serverId,
          date: moment().format("YYYY-MM-DD"),
          time: moment().format("HH:mm"),
        };
        if (data[id]?.phone === "chat") {
          const debugEvents = createLogger({ logFile: "log.txt" });
          runConsoleChat(await sdk.connectChat(serverId)).catch(console.error);
          return {
            accept: true,
            data: data[id],
            debugEvents,
            sessionConfigName: "text",
          };
        } else {
          const debugEvents = createLogger({
            log: console.log,
            logFile: "log.txt",
          });
          return {
            accept: true,
            data: data[id],
            debugEvents,
            sessionConfigName: "audio",
          };
        }
      },
      completedJob: async (id, result, records) => {
        records
          .map(recordToUrl)
          .forEach((url) => console.log({ recordUrl: url }));
        console.log(`Completed job ${id}`, result);
        resolvers[id]({
          ...preliminaryResults[id],
          ...result,
          recordUrl: records[0] ? recordToUrl(records[0]) : undefined,
        });
      },
      failedJob: async (id, error, records) => {
        records
          .map(recordToUrl)
          .forEach((url) => console.log({ recordUrl: url }));
        console.log(`Failed job ${id}`, error);
        resolvers[id]({
          ...preliminaryResults[id],
          recordUrl: records[0] ? recordToUrl(records[0]) : undefined,
          serviceStatus: error.message,
        });
      },
      timedOutJob: async (id) => {
        console.log(`Job ${id} timed out`);
        resolvers[id]({
          ...preliminaryResults[id],
          serviceStatus: "Time out",
        });
      },
    });

    const file = process.argv[2];
    const jobs: IJobDescription[] = [];
    const data: Record<string, IJobParams> = {};
    const preliminaryResults: Record<string, IJobResults> = {};
    const results: Record<string, Promise<IJobResults>> = {};
    const resolvers: Record<
      string,
      (value: IJobResults | PromiseLike<IJobResults>) => void
    > = {};
    const rejectors: Record<string, (reason?: any) => void> = {};
    fs.createReadStream(file)
      .pipe(csv())
      .on("data", (d) => {
        const id = Guid.create().toString();
        const notAfter = new Date(Date.now() + 30000 * 1000);
        data[id] = d;
        results[id] = new Promise<IJobResults>((resolve, reject) => {
          resolvers[id] = resolve;
          rejectors[id] = reject;
        });
        jobs.push({ id, notAfter });
      })
      .on("end", async () => {
        console.log("data:", data);
        console.log("jobs:", jobs);
        console.log("enqueuing");
        await app.enqueueJobs(jobs);
        console.log("enqueued");

        const params: ObjectCsvWriterParams = {
          path: `${moment().format("YYYY_MM_DD_HH_mm")}.csv`,
          header: [
            { id: "appId", title: "appId" },
            { id: "instanceId", title: "instanceId" },
            { id: "clientJobId", title: "clientJobId" },
            { id: "platformJobId", title: "platformJobId" },
            { id: "phone", title: "phone" },
            { id: "user_phone", title: "user_phone" },
            { id: "status", title: "status" },
            { id: "serviceStatus", title: "serviceStatus" },
            { id: "recordUrl", title: "recordUrl" },
            { id: "date", title: "date" },
            { id: "time", title: "time" },
          ],
          fieldDelimiter: ";",
          headerIdDelimiter: ";",
          alwaysQuote: true,
        };
        const writer = createObjectCsvWriter(params);
        for await (const result of Object.values(results)) {
          console.log(result);
          await writer.writeRecords([result]);
        }
      });

  } catch (e) {
    console.error(e);
  }
}

main();
