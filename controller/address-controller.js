const mongoose = require("mongoose");
const Address = require("../models/address-model");
const User = require("../models/user-model");
const { AppError } = require("../utils/app-error");
const { catchAsync } = require("../utils/catch-async");
const { canonicalizeLocation, normalizeDigits, normalizeText } = require("../utils/iran-locations");

const sessionQuery = (query, session) => (session ? query.session(session) : query);
const sessionOptions = (session) => (session ? { session } : {});

const isTransactionUnsupported = (error) => /Transaction numbers are only allowed|replica set|mongos|does not support transactions/i.test(error?.message || "");

const mutateAddresses = async (userId, callback) => {
  const run = async (session = null) => {
    const lock = await User.updateOne({ _id: userId }, { $inc: { __v: 1 } }, sessionOptions(session));
    if (!lock.matchedCount) throw new AppError(404, "حساب پیدا نشد.");
    return callback(session);
  };

  try {
    return await mongoose.connection.transaction((session) => run(session));
  } catch (error) {
    if (!isTransactionUnsupported(error)) throw error;
    return run(null);
  }
};

const normalizeAddressPayload = (payload) => {
  const normalized = { ...payload };
  for (const key of ["title", "recipientName", "province", "city", "addressLine"]) {
    if (normalized[key] !== undefined) normalized[key] = normalizeText(normalized[key]);
  }
  for (const key of ["recipientPhone", "postalCode", "buildingNumber", "unit"]) {
    if (normalized[key] !== undefined) normalized[key] = normalizeDigits(normalized[key]);
  }
  return normalized;
};

const validateLocation = (province, city) => {
  const location = canonicalizeLocation(province, city);
  if (!location) {
    throw new AppError(
      400,
      "استان و شهر انتخاب‌شده با فهرست رسمی شهرهای ایران مطابقت ندارد.",
      [
        { field: "province", message: "استان معتبر را از فهرست انتخاب کنید." },
        { field: "city", message: "شهر معتبر همان استان را انتخاب کنید." },
      ],
      "INVALID_LOCATION",
    );
  }
  return location;
};

const normalizeDefault = async (userId, preferredId, session) => {
  let selected = preferredId;
  if (!selected) {
    const current = await sessionQuery(Address.findOne({ user: userId, isDefault: true }), session);
    const fallback = current || await sessionQuery(Address.findOne({ user: userId }).sort("-createdAt"), session);
    selected = fallback?._id;
  }
  if (!selected) return;
  await Address.updateMany({ user: userId, _id: { $ne: selected } }, { $set: { isDefault: false } }, sessionOptions(session));
  await Address.updateOne({ user: userId, _id: selected }, { $set: { isDefault: true } }, sessionOptions(session));
};

const getMyAddresses = catchAsync(async (req, res) => {
  const addresses = await Address.find({ user: req.user._id }).sort({ isDefault: -1, createdAt: -1 });
  res.json({ status: "success", results: addresses.length, data: { addresses } });
});

const getMyAddress = catchAsync(async (req, res) => {
  const address = await Address.findOne({ _id: req.params.addressId, user: req.user._id });
  if (!address) throw new AppError(404, "آدرس پیدا نشد.");
  res.json({ status: "success", data: { address } });
});

const addAddress = catchAsync(async (req, res) => {
  const cleanBody = normalizeAddressPayload(req.body);
  Object.assign(cleanBody, validateLocation(cleanBody.province, cleanBody.city));

  const address = await mutateAddresses(req.user._id, async (session) => {
    if (await sessionQuery(Address.countDocuments({ user: req.user._id }), session) >= 50)
      throw new AppError(400, "حداکثر ۵۰ آدرس مجاز است.");
    const [created] = await Address.create([{ ...cleanBody, user: req.user._id }], sessionOptions(session));
    await normalizeDefault(req.user._id, cleanBody.isDefault ? created._id : null, session);
    return sessionQuery(Address.findById(created._id), session);
  });
  res.status(201).json({ status: "success", data: { address } });
});

const editAddress = catchAsync(async (req, res) => {
  const cleanBody = normalizeAddressPayload(req.body);
  const address = await mutateAddresses(req.user._id, async (session) => {
    const current = await sessionQuery(Address.findOne({ _id: req.params.addressId, user: req.user._id }), session);
    if (!current) throw new AppError(404, "آدرس پیدا نشد.");

    const nextProvince = cleanBody.province ?? current.province;
    const nextCity = cleanBody.city ?? current.city;
    Object.assign(cleanBody, validateLocation(nextProvince, nextCity));

    const wasDefault = current.isDefault;
    Object.assign(current, cleanBody);
    await current.save(sessionOptions(session));
    let preferred = cleanBody.isDefault === true ? current._id : null;
    if (wasDefault && cleanBody.isDefault === false) {
      const replacement = await sessionQuery(Address.findOne({ user: req.user._id, _id: { $ne: current._id } }).sort("-createdAt"), session);
      preferred = replacement?._id || current._id;
    }
    await normalizeDefault(req.user._id, preferred, session);
    return sessionQuery(Address.findById(current._id), session);
  });
  res.json({ status: "success", data: { address } });
});

const setDefaultAddress = catchAsync(async (req, res) => {
  const address = await mutateAddresses(req.user._id, async (session) => {
    const current = await sessionQuery(Address.findOne({ _id: req.params.addressId, user: req.user._id }), session);
    if (!current) throw new AppError(404, "آدرس پیدا نشد.");
    await normalizeDefault(req.user._id, current._id, session);
    return sessionQuery(Address.findById(current._id), session);
  });
  res.json({ status: "success", data: { address } });
});

const deleteAddress = catchAsync(async (req, res) => {
  await mutateAddresses(req.user._id, async (session) => {
    const deleted = await Address.deleteOne({ _id: req.params.addressId, user: req.user._id }, sessionOptions(session));
    if (!deleted.deletedCount) throw new AppError(404, "آدرس پیدا نشد.");
    await normalizeDefault(req.user._id, null, session);
  });
  res.status(204).send();
});

const getUserAddressesForAdmin = catchAsync(async (req, res) => {
  const addresses = await Address.find({ user: req.params.userId }).sort({ isDefault: -1, createdAt: -1 });
  res.json({ status: "success", results: addresses.length, data: { addresses } });
});

module.exports = { getMyAddresses, getMyAddress, addAddress, editAddress, setDefaultAddress, deleteAddress, getUserAddressesForAdmin };
