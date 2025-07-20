//寝室モニタ実験用SCD40、csv
//co2_monitor.js
import { requestI2CAccess } from "./node_modules/node-web-i2c/index.js";
import SCD40 from "@chirimen/scd40";
import fs from "fs"; // ファイル書き出し用モジュール

const sleep = (msec) => new Promise((resolve) => setTimeout(resolve, msec));
const dateStr = new Date().toISOString().replace(/[:.]/g, "-");
const CSV_PATH = `scd40_log_${dateStr}.csv`;

//const CSV_PATH = "scd40_log01.csv"; // 出力先CSVファイル

main();

async function main() {
    const i2cAccess = await requestI2CAccess();
    const port = i2cAccess.ports.get(1);
    const scd40 = new SCD40(port, 0x62);
    await scd40.init();
    console.log(await scd40.serial_number());
    await scd40.start_periodic_measurement();

    // ウォームアップ（5分）
    console.log("ウォームアップ中（5分）...");
    const warmupStart = Date.now();
    const WARMUP_DURATION = 5 * 60 * 1000; // 5分 = 300000ms
    const LOG_INTERVAL = 30000; // 30秒ごと

    while (Date.now() - warmupStart < WARMUP_DURATION) {
        const data = await scd40.getData();
        const timestamp = new Date().toISOString();
        console.log(`ウォームアップ: ${timestamp}, CO2: ${data.co2} ppm, Temp: ${data.temperature}°C, Hum: ${data.humidity}%`);
        await sleep(LOG_INTERVAL);
    }


    console.log("csvファイル作成");
    // ヘッダーをCSVファイルに書き込む（1回だけ）
    fs.writeFileSync(CSV_PATH, "timestamp,co2,temperature,humidity\n");

    while (true) {
        const data = await scd40.getData();
        const timestamp = new Date().toISOString(); // ISO形式のタイムスタンプ
        const line = `${timestamp},${data.co2},${data.temperature},${data.humidity}\n`;
        fs.appendFileSync(CSV_PATH, line);
        console.log(data);
        await sleep(300000);
    }
}