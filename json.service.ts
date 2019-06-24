import scenegraph from "scenegraph";

class ConvertOptions {
	// skip iterating over nested nodes to prevent infinite loop
	public doNotExpandNodes = false;
}

/**
 * Converts xd nodes into json object
 */
export class JsonService {

	private static readonly skipFields = ["parent", "constructor", "pathData"];

	public convert(value: any, options?: ConvertOptions): any {
		if (this.isPlainType(value)) {
			return value;
		}

		// custom conversion for arrays and xd arrrays
		if (Array.isArray(value) || typeof value["map"] === "function") {
			const collection = value.map((v: any) => this.convert(v, options));
			return collection;
		}

		const json = {};

		// set object class (if any)
		if (Object.getPrototypeOf(value).constructor) {
			const typeName = Object.getPrototypeOf(value).constructor.name;
			if (typeName && typeName !== "Object") {
				json["_type"] = typeName;
			}
		}

		if (options && options.doNotExpandNodes) {
			if (value instanceof scenegraph.GraphicNode) {
				json["guid"] = value.guid;
				return json;
			}
		}

		const keyDescriptors = this.getDescriptors(value);
		const keys = Object.keys(keyDescriptors);
		if (!keys.length) {
			return value;
		}

		for (const key of keys) {
			if (JsonService.skipFields.indexOf(key) > -1 || key[0] === "_") {
				continue;
			}
			const descriptor = keyDescriptors[key];
			const keyValue = this.getValue(value, key, descriptor);
			if (typeof keyValue === "function") {
				continue;
			}

			if (key.indexOf("Interaction") > -1) {
				json[key] = this.convert(keyValue, { doNotExpandNodes: true });
			} else {
				json[key] = this.convert(keyValue, options);
			}
		}

		return json;
	}

	private getDescriptors(value: any): { [key: string]: PropertyDescriptor } {
		let keyDescriptors: { [key: string]: PropertyDescriptor } = {};
		let proto = Object.getPrototypeOf(value);
		while (proto) {
			const protoKeys = Object.getOwnPropertyDescriptors(proto) as { [key: string]: PropertyDescriptor };
			keyDescriptors = { ...keyDescriptors, ...protoKeys };
			proto = Object.getPrototypeOf(proto);
		}

		Object.keys(value).forEach(key => keyDescriptors[key] = null);

		return keyDescriptors;
	}

	private isPlainType(value: any): boolean {
		// skip empty values, simple types and dates
		return (!value
			|| ["object", "function"].indexOf(typeof value) === -1
			|| value instanceof Date);
	}

	private getValue(entity: any, key: string, descriptor?: PropertyDescriptor): any {
		// console.log("getValue", key, typeof entity[key], typeof descriptor.get, !!descriptor.get);
		if (typeof entity[key] === "function" && descriptor) {
			return !!descriptor.get
				? descriptor.get()
				: typeof (descriptor.value === "undefined") ? entity[key] : descriptor.value;
		} else {
			return entity[key];
		}
	}
}
