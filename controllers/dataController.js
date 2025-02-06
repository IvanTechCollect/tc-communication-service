const Community = require("../models/Community");
const Company = require("../models/Company");
const Unit = require("../models/Unit")
const CommunityRemittance = require('../models/CommunityRemittance');
const CompanyRemittance = require('../models/CompanyRemittance');

const extractData = async (unitId) => {
    try {
        const baseUrl = 'https://app.techcollect.net';
        const foundUnit = await Unit.query().where('id', unitId).first();
        const foundCompany = await Company.query().where('id', foundUnit.company_id).first();
        const foundCommunity = await Community.query().where('id', foundUnit.community).first();
        const subscribe_token = btoa(foundUnit.id.toString()); // Base64 encoding the unit_data.id
        const unsubscribe_url = `${baseUrl}/api/unsubscribe/1/${subscribe_token}`; // Constructing the URL

        const remittance = await CommunityRemittance.query().where('community_id', foundUnit.community).first();
        const companyRemittance = await CompanyRemittance.query().where('company_id', foundCompany.id);

        let remittanceName = '';
        let remittanceAddress = '';
        let remittanceCity = '';
        let remittanceState = '';
        let remittanceZip = '';

        if (foundUnit.company_id !== 287 && companyRemittance && remittance) {
            remittanceName = remittance?.remittance_name || companyRemittance?.remittance_name || '';
            remittanceAddress = remittance?.remittance_address || companyRemittance?.remittance_address || '';
            remittanceCity = remittance?.remittance_city || companyRemittance?.remittance_city || '';
            remittanceState = remittance?.remittance_state || companyRemittance?.remittance_state || '';
            remittanceZip = remittance?.remittance_zip || companyRemittance?.remittance_zip || '';
        }

        const data = {
            unsubscribe_url: unsubscribe_url,
            unit_owner: foundUnit.unit_name,
            community_name: foundCommunity.community_name,
            date: new Date().toLocaleDateString('en-US'),
            balance: foundUnit.delinquency_amount,
            company_name: foundCompany.company_name,
            company_email: foundCompany?.communication_email || null,
            company_number: foundCompany.company_phone,
            company_communication_phone_number: foundCompany.communication_phone,
            company_address: foundCompany.address1,
            company_city: foundCompany.city,
            company_state: foundCompany.state,
            company_zip: foundCompany.company_zip,
            unit_address: foundUnit.address1,
            unit_city: foundUnit.city,
            unit_state: foundUnit.state,
            unit_zip: foundUnit.zip_code,
            account_number: foundUnit.accountNo,
            payment_plan_price: '',
            payment_plan_name: '',
            payment_plan_next_due_date: '',
            update_payment_method_url: '', // Will be updated once synapse finishes their work
            mailing_address: foundUnit.mail_address || foundUnit.address1,
            mailing_city: foundUnit.mail_city || foundUnit.city,
            mailing_state: foundUnit.mail_state || foundUnit.state,
            mailing_zip: foundUnit.mail_zip_code || foundUnit.zip_code,
            community_communication_email: foundCommunity?.communication_email || foundCompany?.communication_email,
            unit_email: foundUnit.email,
            formal_date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
            remittance_address: remittanceAddress,
            remittance_city: remittanceCity,
            remittance_state: remittanceState,
            remittance_zip: remittanceZip,
            remittance_name: remittanceName,
            assoc_code: foundCommunity.pield,
            pause: `|PAUSE|`
        };

        return data;
    } catch (error) {

        console.log(error);
        return null;
    }


}

const applyDataToTemplate = async (unitId, templateContent, subject = null) => {
    // Extract data for the unit

    try {
        const data = await extractData(unitId);

        if (!data) {
            return { htmlContent: content }
        }

        // Make a copy of the template content
        let content = templateContent;
        // Replace all placeholders with corresponding data
        for (let key of Object.keys(data)) {
            const placeholder = `{{${key}}}`;
            const value = data[key] !== undefined && data[key] !== null ? data[key] : ''; // Replace undefined/null with empty string
            content = content.replaceAll(placeholder, value);
        }

        content = content.replaceAll(/{{(.*?)}}/g, '');

        if (!subject) {
            return { content: content };

        }

        let newSubject = subject;
        for (let key of Object.keys(data)) {
            const placeholder = `{{${key}}}`;
            const value = data[key] !== undefined && data[key] !== null ? data[key] : ''; // Replace undefined/null with empty string
            newSubject = newSubject.replaceAll(placeholder, value);
        }
        return {
            content: content,
            formattedSubject: newSubject
        }
    } catch (error) {
        console.log(error);
        return {
            content: null,
            formattedSubject: null
        }
    }



};


module.exports = { extractData, applyDataToTemplate };



