<template>
    <div class="photo-upload">
        <label class="upload-box">
            <input type="file" multiple accept="image/*" @change="handleFiles" hidden />
            <i class="fa-solid fa-camera"></i>
            <span>Adicionar fotos</span>
        </label>

        <div class="preview-list" v-if="files.length">
            <div v-for="(file, index) in files" :key="index" class="preview-item">
                <img :src="file.preview" />
                <button class="remove-btn" @click="removeFile(index)">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'PhotoUpload',
    props: {
        modelValue: {
            type: Array,
            default: () => []
        }
    },
    emits: ['update:modelValue'],
    data() {
        return {
            files: []
        }
    },
    mounted() {
        this.files = this.modelValue
    },
    methods: {
        handleFiles(event) {
            const selected = Array.from(event.target.files).map(file => ({
                file,
                preview: URL.createObjectURL(file)
            }))

            this.files = [...this.files, ...selected]
            this.emitFiles()
            event.target.value = ''
        },
        removeFile(index) {
            this.files.splice(index, 1)
            this.emitFiles()
        },
        emitFiles() {
            this.$emit('update:modelValue', this.files)
        }
    }
}
</script>

<style scoped>
.photo-upload {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.upload-box {
    border: 2px dashed #ced4da;
    border-radius: 8px;
    padding: 16px;
    text-align: center;
    cursor: pointer;
    color: #6c757d;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
}

.upload-box i {
    font-size: 22px;
}

.preview-list {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    padding-bottom: 4px;
    /* max-height: 90px; */
}

.preview-item {
    position: relative;
    width: 80px;
    height: 80px;
    flex-shrink: 0;
    background-color: #80808030;
    margin-top: 10px;
    margin-bottom: 10px;
}

.preview-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 8px;
}

.remove-btn {
    position: absolute;
    top: -6px;
    right: -6px;
    background: #dc3545;
    border: none;
    color: white;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    font-size: 12px;
    cursor: pointer;
}
</style>
