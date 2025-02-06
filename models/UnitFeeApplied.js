const { Model } = require('objection');

class UnitFeeApplied extends Model {
    static get tableName() {
        return 'unit_fee_applied';
    }


}

module.exports = UnitFeeApplied;