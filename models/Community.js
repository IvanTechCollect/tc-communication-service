const { Model } = require('objection');

class Community extends Model {
    static get tableName() {
        return 'manage_community';
    }


}

module.exports = Community;