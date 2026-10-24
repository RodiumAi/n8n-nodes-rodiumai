import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { RODIUMAI_CREDENTIAL_TYPE } from '../shared/constants';
import { toRodiumAiError } from '../shared/errors';
import { getChatModels } from '../shared/loadModels';
import { chatFields, chatOperations, executeChat } from './resources/chat';
import { executeListModels, modelFields, modelOperations } from './resources/model';

export class RodiumAi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RodiumAi',
		name: 'rodiumAi',
		icon: { light: 'file:../../icons/rodiumai-monogram.svg', dark: 'file:../../icons/rodiumai-monogram.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Call RodiumAi models directly from a workflow',
		defaults: { name: 'RodiumAi' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: RODIUMAI_CREDENTIAL_TYPE, required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Chat', value: 'chat' },
					{ name: 'Model', value: 'model' },
				],
				default: 'chat',
			},
			...chatOperations,
			...chatFields,
			...modelOperations,
			...modelFields,
		],
	};

	methods = {
		loadOptions: {
			getChatModels,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;

				if (resource === 'chat' && operation === 'createCompletion') {
					const result = await executeChat.call(this, i);
					returnData.push({ json: result, pairedItem: { item: i } });
				} else if (resource === 'model' && operation === 'list') {
					const models = await executeListModels.call(this, i);
					for (const model of models) {
						returnData.push({ json: model as IDataObject, pairedItem: { item: i } });
					}
				} else {
					throw new NodeOperationError(
						this.getNode(),
						`The operation "${operation}" is not supported for resource "${resource}"`,
						{ itemIndex: i },
					);
				}
			} catch (error) {
				const nodeError =
					error instanceof NodeOperationError ? error : toRodiumAiError(this.getNode(), error, i);
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: nodeError.message, description: nodeError.description ?? null },
						pairedItem: { item: i },
					});
					continue;
				}
				throw nodeError;
			}
		}

		return [returnData];
	}
}
