const data = require("../dist/api.json")

exports.handler = async (event, context) => {

    const query = event.queryStringParameters.name;

    return {
        statusCode: 200,
        body: JSON.stringify(data[query])
    };
};