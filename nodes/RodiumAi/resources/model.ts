import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { fetchModels, isChatModel } from '../../shared/loadModels';

const showForList = { show: { resource: ['model'], operation: ['list'] } };

export const modelOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['model'] } },
		options: [
			{
				name: 'List Models',
				value: 'list',
				description: 'List the models available on RodiumAi',
				action: 'List models',
			},
		],
		default: 'list',
	},
];

export const modelFields: INodeProperties[] = [
	{
		displayName: 'Chat Models Only',
		name: 'chatOnly',
		type: 'boolean',
		default: true,
		displayOptions: showForList,
		description: 'Whether to return only available models that support chat completions',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: showForList,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		displayOptions: { show: { resource: ['model'], operation: ['list'], returnAll: [false] } },
		description: 'Max number of results to return',
	},
];

export async function executeListModels(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject[]> {
	const chatOnly = this.getNodeParameter('chatOnly', itemIndex, true) as boolean;
	const returnAll = this.getNodeParameter('returnAll', itemIndex, false) as boolean;

	let models = await fetchModels.call(this);
	if (chatOnly) models = models.filter(isChatModel);
	if (!returnAll) {
		const limit = this.getNodeParameter('limit', itemIndex, 50) as number;
		models = models.slice(0, limit);
	}
	return models as IDataObject[];
}
