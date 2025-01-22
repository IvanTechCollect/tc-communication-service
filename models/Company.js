const { Model } = require('objection');

class Company extends Model {
    static get tableName() {
        return 'users';
    }


}

module.exports = Company;