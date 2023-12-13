import { program } from "commander";
import axios from "axios";
import fs from "fs";
import { format } from "date-fns";
import { toRoman } from "./roman-numerals";

type ShipInfo = { tier: number; type: string; name: string; nation: string };
type PlayerInfo = { ign: string; shipIDs: string[] };

const SHIP_TYPE_PRIORIRY: { [type: string]: number } = {
  Submarine: 1,
  Destroyer: 2,
  Cruiser: 3,
  Battleship: 4,
  AirCarrier: 5,
  Auxiliary: 999,
};

async function fetchShips(appid: string): Promise<Map<string, ShipInfo>> {
  const fetch = async (appid: string, pageNo: number) => {
    return await axios.get(
      "https://api.worldofwarships.asia/wows/encyclopedia/ships/",
      {
        params: {
          application_id: appid,
          language: "ja",
          fields: "type,tier,name,nation",
          page_no: pageNo,
        },
      }
    );
  };

  const ships: {
    id: string;
    tier: number;
    type: string;
    name: string;
    nation: string;
  }[] = [];
  const encycShips = await fetch(appid, 1);
  const pageTotal = encycShips.data.meta.page_total;

  for (let id in encycShips.data.data) {
    const value = encycShips.data.data[id];
    ships.push({
      id: id,
      tier: value.tier,
      type: value.type,
      name: value.name,
      nation: value.nation,
    });
  }

  for (let i = 2; i <= pageTotal; i++) {
    const encycShips = await fetch(appid, i);

    for (let id in encycShips.data.data) {
      const value = encycShips.data.data[id];
      ships.push({
        id: id,
        tier: value.tier,
        type: value.type,
        name: value.name,
        nation: value.nation,
      });
    }
  }

  ships.sort((a, b) => {
    if (a.tier !== b.tier) {
      return a.tier - b.tier;
    }

    if (a.type !== b.type) {
      return SHIP_TYPE_PRIORIRY[a.type] > SHIP_TYPE_PRIORIRY[b.type] ? 1 : -1;
    }

    if (a.nation !== b.nation) {
      return a.nation > b.nation ? 1 : -1;
    }

    return +a.id - +b.id;
  });

  const shipMap: Map<string, ShipInfo> = new Map();
  for (let ship of ships) {
    // 貸与艦を除く
    if (ship.name.startsWith("[") && ship.name.endsWith("]")) {
      continue;
    }

    shipMap.set(ship.id, {
      tier: ship.tier,
      type: ship.type,
      name: ship.name,
      nation: ship.nation,
    });
  }

  return shipMap;
}

async function main() {
  try {
    // コマンドライン引数の取得
    program.argument("<アプリケーションID>");
    program.argument("<クランタグ>");
    program.parse();

    const appid = program.args[0];
    const clanTag = program.args[1];

    // クランIDの取得
    const clansListRes = await axios.get(
      "https://api.worldofwarships.asia/wows/clans/list/",
      {
        params: {
          application_id: appid,
          search: clanTag,
          fields: "tag,clan_id",
        },
      }
    );

    if (clansListRes.data.status !== "ok") {
      throw Error(
        `WGAPIと通信できません。アプリケーションIDが間違っている可能性があります: ${JSON.stringify(
          clansListRes.data
        )}`
      );
    }

    let clanID = 0;
    for (let clan of clansListRes.data.data) {
      if (clan.tag === clanTag) {
        clanID = clan.clan_id;
        break;
      }
    }
    if (clanID === 0) {
      throw Error(`該当のクランタグが存在しません: ${clanTag}`);
    }

    // クランメンバーのID取得
    const clansInfoRes = await axios.get(
      "https://api.worldofwarships.asia/wows/clans/info/",
      {
        params: {
          application_id: appid,
          clan_id: clanID,
          fields: "members_ids",
        },
      }
    );

    let playerMap: Map<string, PlayerInfo> = new Map();

    for (let accountID of clansInfoRes.data.data[clanID]["members_ids"]) {
      playerMap.set(accountID, { ign: "", shipIDs: [] });
    }
    const accountIDs = [...playerMap.keys()];

    // IGNの取得
    const accountInfoRes = await axios.get(
      "https://api.worldofwarships.asia/wows/account/info/",
      {
        params: {
          application_id: appid,
          account_id: accountIDs.join(","),
          field: "nickname",
        },
      }
    );

    accountIDs.forEach((accountID) => {
      const player = playerMap.get(accountID);
      if (player) {
        player.ign = accountInfoRes.data.data[accountID].nickname;
        playerMap.set(accountID, player);
      }
    });

    // 艦情報の取得
    const shipMap = await fetchShips(appid);

    // 保持艦のIDを取得
    for (let accountID of accountIDs) {
      const response = await axios.get(
        "https://api.worldofwarships.asia/wows/ships/stats/",
        {
          params: {
            application_id: appid,
            account_id: accountID,
            fields: "ship_id",
          },
        }
      );

      const shipIDs: string[] = [];
      for (let ship of response.data.data[accountID]) {
        shipIDs.push(ship.ship_id);
      }

      const player = playerMap.get(accountID);
      if (player) {
        player.shipIDs = shipIDs;
        playerMap.set(accountID, player);
      }
    }

    // 出力
    const lines: string[] = [];
    const columns = [...playerMap.values()].map((it) => it.ign);
    columns.unshift("");
    lines.push(columns.join(","));

    [...shipMap.entries()].forEach(([shipID, ship]) => {
      const columns: string[] = [];
      columns.push(`${toRoman(ship.tier)} ${ship.name}`);

      [...playerMap.values()].forEach((player) => {
        const mark = player.shipIDs.find((it) => it == shipID) ? "◯" : "";
        columns.push(mark);
      });

      lines.push(columns.join(","));
    });

    const outputFileName = `shiplist_${clanTag}_${format(
      new Date(),
      "yyyyMMdd"
    )}.csv`;
    fs.writeFileSync(outputFileName, lines.join("\n"));
    console.log(`${outputFileName}への出力に成功しました！`);
  } catch (error) {
    console.log(error);
  }
}

main();
