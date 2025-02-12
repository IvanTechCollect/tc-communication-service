const ScheduledStep = require('../models/ScheduledStep');
const ProactiveRoadmap = require('../models/ProactiveRoadmap');

const scheduleNextStep = async (unitId, days) => {



    const stepToSchedule = await ProactiveRoadmap.query().where('unit_id', unitId).where('status', 0).where('is_scheduled', 0).first();

    if (stepToSchedule) {
        await ScheduledStep.query().insert({
            unit_id: unitId,
            proactive_id: stepToSchedule.id,
            completed: 0,
            scheduled_at: moment().add({ days: days }).format(),
            created_at: new Date()
        })

    }





}


module.exports = { scheduleNextStep }