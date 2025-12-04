import {TextComponent} from "obsidian";

export function setupArrayTextSetting(
	text: TextComponent,
	initialArray: string[],
	onChange: (array: string[]) => Promise<void>
) {
	text
		.setValue(initialArray.join(", "))
		.onChange(async (value) => {
			const array = value
				.split(",")
				.map(field => field.trim())
				.filter(field => field.length > 0);

			await onChange(array);
		});

	text.inputEl.addEventListener("blur", () => {
		const currentValue = text.inputEl.value;
		const cleaned = currentValue
			.split(",")
			.map(field => field.trim())
			.filter(field => field.length > 0)
			.join(", ");

		if (currentValue !== cleaned) {
			text.setValue(cleaned);
		}
	});
}
