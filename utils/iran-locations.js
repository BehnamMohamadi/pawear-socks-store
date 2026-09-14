const { getProvinces } = require("@code-plate/iran-cities");

const normalizeText = (value) => String(value ?? "")
  .normalize("NFKC")
  .replace(/ي/g, "ی")
  .replace(/ك/g, "ک")
  .replace(/[\u200c\u200d]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const normalizeDigits = (value) => String(value ?? "")
  .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
  .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
  .trim();

const locationTree = getProvinces()
  .map((province) => ({
    province: normalizeText(province.fa),
    cities: (province.cities || []).map((city) => normalizeText(city.fa)).filter(Boolean),
  }))
  .filter((province) => province.province && province.cities.length);

const locationLookup = new Map(
  locationTree.map((province) => [
    normalizeText(province.province),
    {
      province: province.province,
      cities: new Map(province.cities.map((city) => [normalizeText(city), city])),
    },
  ]),
);

const canonicalizeLocation = (provinceValue, cityValue) => {
  const province = locationLookup.get(normalizeText(provinceValue));
  if (!province) return null;
  const city = province.cities.get(normalizeText(cityValue));
  if (!city) return null;
  return { province: province.province, city };
};

const getLocationTree = () => locationTree.map((item) => ({
  province: item.province,
  cities: [...item.cities],
}));

module.exports = {
  normalizeText,
  normalizeDigits,
  canonicalizeLocation,
  getLocationTree,
};
