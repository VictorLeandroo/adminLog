export default {
    beforeMount(el, binding) {
        const config = typeof binding.value === 'object' ? binding.value : { maxDecimals: binding.value || 2 };
        const maxDecimals = config.maxDecimals || 2;
        const allowNegative = config.allowNegative || false;
        const formatUS = config.formatUS || false;

        el.addEventListener('input', (event) => {
            let start = el.selectionStart;
            let value = el.value;
            let inputData = event.data;

            value = value.replace(/[^\d,,-.]/g, '');

            let isNegative = false;

            if (allowNegative) {
                if (value.startsWith('-')) {
                    isNegative = true;
                    value = value.slice(1);
                }
                value = value.replace(/-/g, '');
            } else {
                value = value.replace(/-/g, '');
            }

            if (inputData === '.') {
                if (value.indexOf(',') === -1) {
                    value = value.replace(/\./g, '');
                    value = value + ',';
                }
            }

            let sanitizedValue = value.replace(/\./g, '').replace(/,/g, '.');

            let parts = sanitizedValue.split('.');
            let integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');

            let formattedValue = (isNegative ? '-' : '') + integerPart;

            if (parts.length > 1) {
                let decimalPart = parts[1].slice(0, maxDecimals);
                formattedValue += ',' + decimalPart;
            }

            if (formattedValue !== el.value) {
                el.value = formattedValue;

                let diff = formattedValue.length - value.length;
                let newCursorPosition = start + diff + (isNegative ? 1 : 0);
                el.setSelectionRange(newCursorPosition, newCursorPosition);

                el.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });

        el.addEventListener('paste', (event) => {
            event.preventDefault();
            let pasted = (event.clipboardData || window.clipboardData).getData('text').trim();

            pasted = pasted.replace(/[^\d.,-]/g, '');

            let isUSFormat = false;

            if (formatUS) {
                if (pasted.includes('.') && (!pasted.includes(',') || pasted.match(/,\d{3}\./))) {
                    isUSFormat = true;
                }
            }

            if (isUSFormat) {
                pasted = pasted.replace(/,/g, '#').replace(/\./g, ',').replace(/#/g, '.');
            }

            document.execCommand('insertText', false, pasted);
        });


    }
};
