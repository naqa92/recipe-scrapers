import { Scraper } from "../scraper.ts";
import { getText, selectOne } from "../helpers.ts";

export const hosts = ["krollskorner.com"];

export default class extends Scraper {
  override author(): string | undefined {
    const tag = selectOne(this.$, ".wprm-recipe-details.wprm-recipe-author.wprm-block-text-normal a");
    return tag ? getText(tag, "", true) : undefined;
  }
}
