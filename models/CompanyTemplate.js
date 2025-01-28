const { Model } = require('objection');

class CompanyTemplate extends Model {
    static get tableName() {
        return 'company_user_templates';
    }


}

module.exports = CompanyTemplate;