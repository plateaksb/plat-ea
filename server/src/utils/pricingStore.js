const fs = require("fs");
const path = require("path");

const pricingFilePath = path.join(__dirname, "..", "data", "pricing.json");

function readPricing() {
  const rawData = fs.readFileSync(pricingFilePath, "utf-8");
  return JSON.parse(rawData);
}

function writePricing(data) {
  fs.writeFileSync(pricingFilePath, JSON.stringify(data, null, 2), "utf-8");
}

module.exports = {
  readPricing,
  writePricing,
};