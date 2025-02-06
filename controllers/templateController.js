const TimelineRule = require('../models/TimelineRule');
const CompanyTemplates = require('../models/CompanyTemplate');

const extractTemplate = async (templateType, ruleId, communityId, companyId) => {
    let tempData = '';

    if (ruleId !== 'No Rule') {
        let result = await extractCustomTemplate(ruleId, communityId);
        if (result) {
            tempData = result;
        } else {
            result = await extractCommunityTemplate(communityId, templateType, companyId);
            if (result) {
                tempData = result;
            } else {
                result = await extractDefaultCompanyTemplate(companyId, templateType);
                if (result) tempData = result;
            }
        }
    } else {
        let result = await extractCommunityTemplate(communityId, templateType, companyId);
        if (result) {
            tempData = result;
        } else {
            result = await extractDefaultCompanyTemplate(companyId, templateType);
            if (result) tempData = result;
        }
    }

    return tempData;
};

const extractCustomTemplate = async (ruleId, communityId) => {
    try {
        const foundRule = await TimelineRule.query().findById(ruleId);
        if (!foundRule) return false;

        const templateId = foundRule.template;
        const foundTemplate = await CompanyTemplates.query().findById(templateId);
        if (!foundTemplate) return false;

        const criteria = JSON.parse(foundRule.criteria);
        const appliesTo = criteria.appliesTo;

        let content = '';

        if (appliesTo !== 'always') {
            if (Array.isArray(appliesTo) && !appliesTo.includes(communityId)) return false;
        }

        content = foundTemplate.is_raw ? foundTemplate.raw_content : foundTemplate.template_content;

        if (foundTemplate.type === 'LETTER') {
            return [content, foundTemplate.certified, foundTemplate.include_ledger];
        } else if (foundTemplate.type === 'EMAIL') {
            return [content, foundTemplate.subject, foundTemplate.include_ledger];
        } else {
            return content;
        }
    } catch (error) {
        console.error('Error in extractCustomTemplate:', error.message);
        return false;
    }
};

const extractCommunityTemplate = async (communityId, templateType, companyId) => {
    try {
        const communityTemplates = await CompanyTemplates.query()
            .where('type', templateType)
            .where('user_id', companyId)
            .where('default', 0);

        if (!communityTemplates.length) return false;

        const filteredTemplates = communityTemplates.filter(template => {
            const ids = JSON.parse(template.community_ids);
            return ids.includes(communityId);
        });

        if (!filteredTemplates.length) return false;

        const template = filteredTemplates[0];

        const content = template.is_raw ? template.raw_content : template.template_content;

        if (templateType === 'LETTER' && content) {
            return [content, template.certified, template.include_ledger];
        } else if (templateType === 'EMAIL' && content) {
            return [content, template.subject, template.include_ledger];
        } else {
            return content;
        }
    } catch (error) {
        console.log(error);
        console.error('Error in extractCommunityTemplate:', error.message);
        return false;
    }
};

const extractDefaultCompanyTemplate = async (companyId, templateType) => {
    try {
        const companyTemplate = await CompanyTemplates.query()
            .where('user_id', companyId)
            .where('type', templateType)
            .where('default', 1)
            .first();

        if (!companyTemplate) return false;

        const content = companyTemplate.is_raw ? companyTemplate.raw_content : companyTemplate.template_content;

        if (templateType === 'LETTER') {
            return [content, companyTemplate.certified, companyTemplate.include_ledger];
        } else if (templateType === 'EMAIL') {
            return [content, companyTemplate.subject, companyTemplate.include_ledger];
        } else {
            return content;
        }
    } catch (error) {
        console.error('Error in extractDefaultCompanyTemplate:', error.message);
        return false;
    }
};

module.exports = {
    extractTemplate,
};
