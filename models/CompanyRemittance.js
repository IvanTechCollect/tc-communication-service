const { Model } = require('objection');

class CompanyRemittance extends Model {
    static get tableName() {
        return 'company_remittance';
    }


}

module.exports = CompanyRemittance;