const { Model } = require('objection');

class CommunityRemittance extends Model {
    static get tableName() {
        return 'community_remittance';
    }


}

module.exports = CommunityRemittance;