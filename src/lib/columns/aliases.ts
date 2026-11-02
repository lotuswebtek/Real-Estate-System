export type MasterColumn = {
  displayName: string;
  normalizedKey: string;
  aliases: string[];
};

export const MASTER_COLUMNS: MasterColumn[] = [
  {
    displayName: "Owner Name",
    normalizedKey: "name",
    aliases: [
      "name",
      "owner",
      "owner name",
      "full name",
      "customer name",
      "client name",
      "buyer name",
      "landlord name",
      "tenant name",
      "seller name",
      "name en",
      "owner name (en)",
      "owner name en",
    ],
  },
  {
    displayName: "Mobile",
    normalizedKey: "mobile",
    aliases: [
      "mobile",
      "mobile no",
      "mobile number",
      "phone",
      "phone no",
      "phone number",
      "contact",
      "contact no",
      "cell",
      "tel",
      "telephone",
      "whatsapp",
      "mobile 1",
      "phone 1",
      "phone mobile",
    ],
  },
  {
    displayName: "Mobile 2",
    normalizedKey: "mobile_2",
    aliases: [
      "mobile 2",
      "phone 2",
      "secondary mobile",
      "secondary number",
      "alternate number",
      "other phone",
      "phone home",
      "work phone",
    ],
  },
  {
    displayName: "Email",
    normalizedKey: "email",
    aliases: ["email", "e-mail", "email address", "mail"],
  },
  {
    displayName: "Nationality",
    normalizedKey: "nationality",
    aliases: ["nationality", "country", "nation", "country name", "country name en"],
  },
  {
    displayName: "Community",
    normalizedKey: "area",
    aliases: ["area", "community", "location", "district", "region", "city", "sub community", "area name", "area name en", "master location"],
  },
  {
    displayName: "Building Name",
    normalizedKey: "project",
    aliases: ["project", "project name", "building", "building name", "building name en", "building number", "tower", "master project"],
  },
  {
    displayName: "Plot Number",
    normalizedKey: "plot",
    aliases: ["plot", "plot no", "plot number", "plot ref", "plot reference", "parcel", "parcel id", "land no", "land number"],
  },
  {
    displayName: "Unit Number",
    normalizedKey: "unit",
    aliases: ["unit", "unit no", "unit number", "flat", "flat no", "apartment", "villa", "property no", "flat number", "villa number", "villa no"],
  },
  {
    displayName: "Bedrooms",
    normalizedKey: "bedrooms",
    aliases: ["bedrooms", "bedroom", "beds", "no of bedrooms", "no of rooms"],
  },
  {
    displayName: "Role",
    normalizedKey: "role",
    aliases: ["role", "owner type", "contact type", "customer type", "client type"],
  },
  {
    displayName: "Emirate",
    normalizedKey: "emirate",
    aliases: ["emirate", "emirates"],
  },
  {
    displayName: "Property Type",
    normalizedKey: "property_type",
    aliases: ["property type", "property type en", "type", "unit type", "usage"],
  },
  {
    displayName: "Size",
    normalizedKey: "size",
    aliases: ["size", "area sqft", "sqft", "area (sqft)", "size sqft", "plot area", "plot size", "bua", "actual area", "actual size", "built up"],
  },
  {
    displayName: "Price",
    normalizedKey: "price",
    aliases: ["price", "amount", "value", "procedure value", "sale price", "transaction amount"],
  },
  {
    displayName: "Date",
    normalizedKey: "date",
    aliases: ["date", "registration date", "transaction date", "procedure date"],
  },
  {
    displayName: "ID / Passport",
    normalizedKey: "id_passport",
    aliases: ["emirates id", "eid", "id number", "uae id", "uae id number", "passport", "passport no"],
  },
];
