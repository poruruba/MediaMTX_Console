const HELPER_BASE = "../../helpers/opt/" || "/opt/";
import Response from '../../helpers/opt/response.mjs';
import Redirect from '../../helpers/opt/redirect.mjs';

export const handler = async (event, context, callback) => {
	console.log(event.queryStringParameters);
	return new Response({ message: 'Hello World' });
};
