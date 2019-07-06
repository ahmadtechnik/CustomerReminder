//
$(document).ready(() => {
    $(`#uploadeFileHiddenBtn`).change(onFileUploadedAction);
});

function onFileUploadedAction(event) {
    var files = this.files[0];
    if(files !== undefined){
        $(`#uploadedFileName`).text(files.name);
    }
}