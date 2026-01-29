import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
    return {
        statusCode: 200,
        body: JSON.stringify({
            message: 'Netlify Functions are working!',
            path: event.path,
        }),
    };
};
