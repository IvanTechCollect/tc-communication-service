const ScheduledStep = require('../models/ScheduledStep');
const ProactiveRoadmap = require('../models/ProactiveRoadmap');
const moment = require('moment');

const scheduleNextStep = async (unitId) => {

    console.log('Scheduling next step for unit:', unitId);


    const stepToSchedule = await ProactiveRoadmap.query().where('unit_id', unitId).where('status', 0).where('communication_status', 1).where('is_scheduled', 0).first();

    const ranStep = await ProactiveRoadmap.query().where('unit_id', unitId).where('status', '!=', 0).where('communication_status', 1).where('is_scheduled', 1).first();



    const days = stepToSchedule.days - ranStep.days;


    await ScheduledStep.query().where('unit_id', unitId).delete();


    if (stepToSchedule) {
        await ScheduledStep.query().insert({
            unit_id: unitId,
            proactive_id: stepToSchedule.id,
            completed: 0,
            scheduled_at: moment().add({ days: days }).toDate(),
            created_at: new Date()
        })

        await ProactiveRoadmap.query().where('id', stepToSchedule.id).update({ 'is_scheduled': 1 });
    } else {
        await ProactiveRoadmap.query().where('id', unitId).update({ 'is_scheduled': 0 });

    }








}


module.exports = { scheduleNextStep }