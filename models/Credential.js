// models/Credential.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const credentialSchema = new Schema({
    partner: { type: String, required: true },
    companyId: { type: Number, required: true },
    url: { type: String, required: true },
    clientId: { type: String, required: true },
    clientSecret: { type: String, required: true },
    company: { type: String, required: false },
    login: { type: String, required: false },
    password: { type: String, required: false },
    tokenUrl: { type: String, required: false }
});



const Credential = mongoose.model('Credential', credentialSchema);

module.exports = Credential;
