const express = require('express');
const moment = require('moment');
const ManageUnit = require('../models/Unit');
const Company = require('../models/Company');
const ManageCommunity = require('../models/Community');
const UnitFeeApplied = require('../models/UnitFeeApplied');
const CommunityRemittance = require('../models/CommunityRemittance');
const CompanyRemittance = require('../models/CompanyRemittance');

const generateLedgerHtml = async (unitId) => {
    try {
        const foundUnit = await ManageUnit.query().where('id', unitId).first();
        if (!foundUnit) throw new Error('Unit not found');

        const foundCompany = await Company.query().where('id', foundUnit.company_id).first();
        if (!foundCompany) throw new Error('Company not found');

        const foundCommunity = await ManageCommunity.query().where('id', foundUnit.community).first();
        const ledgerData = await UnitFeeApplied.query().where('unit_id', unitId);
        const partner = foundCompany.partner;

        const charges = await UnitFeeApplied.query()
            .where('unit_id', unitId)
            .whereNot('status', 1)
            .sum('fee_amount as total');

        const payments = await UnitFeeApplied.query()
            .where('unit_id', unitId)
            .where('status', 1)
            .sum('fee_amount as total');
        const balance = (charges[0]?.total || 0) - (payments[0]?.total || 0);


        let remittance = await CommunityRemittance.query().where('community_id', foundUnit.community).first();
        if (!remittance) {
            remittance = await CompanyRemittance.query().where(`company_id`, foundUnit.company_id).first();
        }

        const data = {
            unit_owner: foundUnit.unit_name,
            date: moment().format("MM/DD/YYYY"),
            balance,
            company_name: foundCompany.company_name,
            company_email: foundCompany.communication_email,
            company_image: encodeURIComponent(foundCompany.image || ''),
            company_number: foundCompany.company_phone,
            company_address: foundCompany.address1,
            company_city: foundCompany.city,
            company_state: foundCompany.state,
            company_zip: foundCompany.zip_code,
            unit_address: foundUnit.address1,
            unit_city: foundUnit.city,
            unit_state: foundUnit.state,
            unit_zip: foundUnit.zip_code,
            account_number: foundUnit.accountNo,
            mailing_address: foundUnit.mail_address,
            mailing_city: foundUnit.mail_city,
            mailing_state: foundUnit.mail_state,
            mailing_zip: foundUnit.mail_zip_code,
            community_name: foundCommunity?.community_name || foundCompany.company_name,
            community_address: foundCommunity?.address || foundCompany.address1,
            community_city: foundCommunity?.city || foundCompany.city,
            community_state: foundCommunity?.state || foundCompany.state,
            community_zip: foundCommunity?.zip || foundCompany.zip_code,
            remittance_address: remittance?.remittance_address || '',
            remittance_city: remittance?.remittance_city || '',
            remittance_state: remittance?.remittance_state || '',
            remittance_zip: remittance?.remittance_zip || '',
            remittance_name: remittance?.remittance_name || '',
            page_break: '<p style="page-break-before: always;">&nbsp;</p>',
            formal_date: moment().format('MMMM Do, YYYY'),
        };

        if (!partner) return '';

        if (partner === 'Cinc') {
            return generateCincLedger(ledgerData, data);
        } else if (partner === 'Vantaca') {
            return generateVantacaLedger(ledgerData, data);
        }

        return '';
    } catch (error) {
        console.error('Error generating ledger:', error.message);
        return `<p>Error: ${error.message}</p>`;
    }
};


function generateCincLedger(ledgerData, data) {
    let ledgerHtml = '';
    let total = 0;
    let isOdd = true;

    ledgerData.forEach(lineItem => {
        const lineDate = moment(lineItem.created_at).format('MM/DD/YYYY');

        const row = {
            date: lineDate,
            description: lineItem.description,
            charge: lineItem.status === 0 ? `$${lineItem.fee_amount}` : '',
            payment: lineItem.status === 1 ? `($${lineItem.fee_amount})` : '',
            amount: lineItem.status === 0 ? lineItem.fee_amount : -lineItem.fee_amount,
            notes: lineItem.notes,
            transactionType: lineItem.status
        };

        const color = isOdd ? 'rgba(214, 214, 214, 0.404)' : 'transparent';

        ledgerHtml += `
            <tr style="background-color: ${color}">
                <td class="ledger-td"> ${row.date} </td>
                <td class="ledger-td"> ${row.description} </td>
                <td class="ledger-td"> ${row.charge} </td>
                <td class="ledger-td"> ${row.payment} </td>
            </tr>
        `;

        total += parseFloat(row.amount);
        isOdd = !isOdd;
    });

    let finalHtml = `
        <div>
            <style>
                table, th, td {
                    font-family: Arial, Helvetica, sans-serif;
                    border-collapse: collapse;
                }
                .ledger-th {
                    background-color: #5f9deb;
                    text-align: left;
                    padding: 5px;
                }
                .ledger-td {
                    padding: 5px;
                }
                .table-outline {
                    font-family: Arial, Helvetica, sans-serif;
                    width: 90%;
                    margin: 30px auto;
                }
            </style>

            <table class="table-outline">
                <tr>
                    <td style="width: 33%; font-size: 14px">
                        ${data.community_name} <br />
                        ${data.company_name} <br />
                        ${data.company_address} <br />
                        ${data.company_city}, ${data.company_state} ${data.company_zip} <br />
                    </td>
                    <td style="width: 33%; text-align: center;">
                        <img src="/images/users/${data.company_image}" width="100%" height="auto" />
                    </td>
                    <td style="width: 33%; text-align: center;">
                        <table style="border: 2px solid #5f9deb; font-size: 14px; width: 80%; float: right;">
                            <tr>
                                <td style="padding-bottom: 5px; width: 50%; text-align: left; background-color: #5f9deb;">
                                    <strong>Statement Date:</strong>
                                </td>
                                <td style="padding-bottom: 5px; width: 50%;">
                                    <strong>${data.date}</strong>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>

            <h2 style="width: 100%; text-align: center; font-family: Arial, Helvetica, sans-serif;">Statement</h2>

            <table class="table-outline">
                <tr>
                    <td style="width: 33%; font-size: 14px;">
                        ${data.unit_owner} <br />
                        ${data.unit_address} <br />
                        ${data.unit_city}, ${data.unit_state} ${data.unit_zip} <br />
                    </td>
                    <td style="width: 33%; text-align: center;"></td>
                    <td style="width: 33%; text-align: center;">
                        <table style="border: 2px solid #5f9deb; font-size: 14px; width: 80%; float: right;">
                            <tr>
                                <td style="padding-bottom: 15px; width: 50%; text-align: left; background-color: #5f9deb;">
                                    <strong>Account Number:</strong>
                                </td>
                                <td style="padding-bottom: 15px; width: 50%;">
                                    <strong>${data.account_number}</strong>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>

            <table class="table-outline">
                <thead>
                    <tr>
                        <th class="ledger-th"> Date </th>
                        <th class="ledger-th" style="width: 40%;"> Description </th>
                        <th class="ledger-th"> Charge </th>
                        <th class="ledger-th"> Payment </th>
                    </tr>
                </thead>
                <tbody>
                    ${ledgerHtml}
                    <tr style="height: 40px; background-color: #5f9deb;">
                        <td colspan="3"> <b>Total as of ${data.date}</b> </td>
                        <td> <b> $${total.toFixed(2)} </b> </td>
                    </tr>
                </tbody>
            </table>

            <div style="letter-spacing: 2px; margin-top: 20px">
                <span style="display: inline-block; width: 100%; border-top: 1px dashed black; text-align: center;">
                    <i> Please see below for payment instructions </i>
                </span>
            </div>

            <table class="table-outline">
                <tbody>
                    <tr>
                        <td style="width: 20%; font-size: 14px;">
                            <div>Re: ${data.unit_address} Past Due Balance </div>
                        </td>
                    </tr>
                </tbody>
            </table>

            <table class="table-outline">
                <tbody>
                    <tr>
                        <td style="width: 10%; text-indent: 20px; font-size: 14px; vertical-align: top;">
                            To:
                        </td>
                        <td style="width: 33%; font-size: 14px;">
                            ${data.community_name}<br>
                            c/o ${data.company_name} <br>
                            ${data.remittance_address} <br>
                            ${data.remittance_city}, ${data.remittance_state} ${data.remittance_zip}<br>
                        </td>
                        <td style="width: 43%; text-align: left;">
                            <div style="font-weight: 700">Mail Payments To:</div>
                            <div><b>${data.community_name}</b></div>
                        </td>
                    </tr>
                </tbody>
            </table>

            <div style="text-align: center;">
                <span style="display: inline-block; width: 100%; border-top: 1px solid black;"></span>
                <span>
                    Please include account number <strong>${data.account_number}</strong> on the memo line of any mailed payment.
                    ${data.company_name === 'The Nabo Group' ? `Alternatively, visit <a href="https://www.thenabogroup.com">www.thenabogroup.com</a> to make a payment online.` : ''}
                </span>
            </div>
        </div>
    `;

    return finalHtml;
}


function generateVantacaLedger(ledgerData, data) {
    let total = 0;
    let rowNum = 0;
    let htmlRows = [];

    ledgerData.forEach(lineItem => {
        const date = moment(lineItem.created_at).format('MM/DD/YY');
        const charge = lineItem.status === 0 ? `$${lineItem.fee_amount}` : '';
        const payment = lineItem.status === 1 ? `($${lineItem.fee_amount})` : '';
        const amount = lineItem.status === 0 ? lineItem.fee_amount : -lineItem.fee_amount;

        total += parseFloat(amount);

        const className = rowNum % 2 === 0 ? 'even-row' : 'odd-row';

        htmlRows.push(`
            <tr style="font-size: 14px;" class="${className}">
                <td>${date}</td>
                <td>${lineItem.description}</td>
                <td>${charge}</td>
                <td>${payment}</td>
                <td>$${total.toFixed(2)}</td>
            </tr>
        `);

        rowNum++;
    });

    data.total = total;

    let rawHtml = `
        <div style="padding: 20px; font-family: Arial, Helvetica, sans-serif; font-size: 14px">
            <style>
                .ledger-data {
                    border-collapse: collapse;
                    width: 100%;
                    border: 2px solid black;
                }
                .ledger-data th, .ledger-data td {
                    padding: 10px;
                    border: 2px solid black;
                }
                .even-row { background-color: white; }
                .odd-row { background-color: rgba(157, 157, 157, 0.404); }
            </style>

            <table style="width: 100%; margin-bottom: 30px; font-size: 14px;">
                <tr>
                    <td style="width: 50%; vertical-align: top;">
                        <div>${data.community_name}</div>
                        <div>${data.company_name}</div>
                        <div>${data.community_address}</div>
                        <div>${data.community_city}, ${data.community_state} ${data.community_zip}</div>
                    </td>
                    <td>
                        <div style="padding: 0px 20px;">
                            <span style="font-size: 14px; font-weight: 700;">Account Statement</span>
                            <span style="float: right;"> as of ${data.date}</span>
                        </div>
                        <table class="ledger-data" style="width: 100%; font-size: 14px;">
                            <thead style="background-color: black; color: white;">
                                <th>Account Number</th>
                                <th>Due Date</th>
                                <th>Pay this Amount</th>
                            </thead>
                            <tbody style="text-align: center; font-size: 14px;">
                                <tr>
                                    <td>${data.account_number}</td>
                                    <td>Past Due</td>
                                    <td>$${data.balance}</td>
                                </tr>
                            </tbody>
                        </table>
                    </td>
                </tr>
            </table>

            <div style="min-height: 300px;">
                <table class="ledger-data" style="width: 100%; font-size: 14px;">
                    <thead style="background-color: black; color: white;">
                        <th>DATE</th>
                        <th>DESCRIPTION</th>
                        <th>CHARGES</th>
                        <th>PAYMENTS</th>
                        <th>TOTAL</th>
                    </thead>
                    <tbody>
                        ${htmlRows.join('')}
                    </tbody>
                </table>
            </div>

            <div>
                <h3>Mail Checks to:</h3>
                <div>${data.community_name}</div>
                <div>${data.remittance_name}</div>
                <div>${data.remittance_address}</div>
                <div>${data.remittance_city}, ${data.remittance_state} ${data.remittance_zip}</div>
            </div>
        </div>
    `;

    return rawHtml;
}


module.exports = { generateLedgerHtml };
