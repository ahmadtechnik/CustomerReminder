var XLSX = require("xlsx");

//
$(document).ready(() => {
    //
    $(`#uploadeFileHiddenBtn`).change(onFileUploadedAction);
    //
    $(`.sidebar`).sidebar("toggle");
    //
    $(`.searchByInputField`).keydown(onSearchFieldsKeyDown);
    $(`.searchByInputField`).focusout(onSearchFieldFucosout);
    $(`.searchByInputField`).focusin(onSearchFieldFucosIn);
    //
    $('#uploadFileAccordion').accordion();
});

var SELECT_CLASS = ["ui", "segment", "teal", "inverted", "basic"];
var HIDE_CSS_CLASS = {
    "display": "none",
};
var SHOW_CSS_CLASS = {
    "display": ""
};

function onFileUploadedAction(event) {
    var file = this.files[0];
    if (file !== undefined) {
        $(`#uploadedFileName`).text(file.name);
        var fileReader = new FileReader();
        fileReader.onload = (F) => {
            var file = new Uint8Array(F.target.result);

            var xlsxFile = XLSX.read(file, {
                type: "array"
            }).Sheets;

            $.each(xlsxFile, (index, sheet) => {
                var jsonSheet = XLSX.utils.sheet_to_json(sheet);

                if (jsonSheet.length > 0) {
                    var html = XLSX.utils.sheet_to_html(sheet, {
                        editable: false,
                    });
                    // get table from HTML
                    var table = $($(html)[2]);

                    // create new table
                    var tableE = $(`<table class="ui celled  very compacttable table"></table>`);
                    var tableHead = $(`<thead></thead>`);
                    var tableBody = $(`<tbody></thead>`);

                    // get first row of the table
                    var tableHeader = table.find("tbody").find("tr")[0];
                    /** replace the td with th to make the first row as header */
                    var ColumnsIndexes = {};
                    $(tableHeader).find("td").each((i, v) => {
                        $(v).replaceWith(`<th>${v.textContent}-${i}</th>`);
                        ColumnsIndexes[i] = $(v).text();
                    });

                    // append all rows without header
                    table.find("tbody").find("tr").each((index, row) => {

                        if (index !== 0 && $(row).children().length > 0) {
                            tableBody.append(row);
                        } else {

                        }
                        /** detect if row is empty */
                        var rowDR = $(row).find("td");
                        var rowDRDS = $(row).find("[t='z']");

                        if (rowDR.length === rowDRDS.length) {
                            row.remove()
                        } else {
                            /** set row id from index num 1 */
                            if ($(row).find("td")[1].textContent !== "") {
                                $(row).attr("id", $(row).find("td")[1].textContent);
                            }
                        }


                        /** detect all emails and phone numbers/Emails date of birth and */
                        if ($(row).children().length > 0 && index !== 0) {

                            var children = $(row).children();
                            /** each row cell */
                            children.each((index, chiled) => {
                                /** check number mach */
                                var machPhone = chiled.textContent.match(regularEx.MobileWithCountryCode);
                                var machEmail = chiled.textContent.match(regularEx.EmailAddress);
                                var machDate = chiled.textContent.match(regularEx.dates);
                                var datesPoints = chiled.textContent.match(regularEx.datesPoints);
                                /** detect Phone Number */
                                if (machPhone) {
                                    if (index === 9) {
                                        /** repace white space */
                                        $(chiled).text($(chiled).text().replace(/[\s]/g, ""))
                                        $(chiled).attr("action", "sendSMS");
                                        $(chiled).attr("number", chiled.textContent);
                                        $(chiled).addClass(["cursor"]);

                                        $(chiled).css({
                                            background: "#0f3d0f",
                                            color: "white"
                                        });
                                    }
                                }
                                /** start detect Email address */
                                if (machEmail) {
                                    $(chiled).append("<br><a class='item'>Email</a>");
                                    $(chiled).addClass("warning");
                                    $(chiled).addClass(["positive", "cursor"]);
                                }
                                /** detect all dates in the table */
                                if (machDate || datesPoints) {

                                    var DataInTable = Date.parse(chiled.textContent);
                                    var DateToday = new Date();
                                    var Difrant = Date.parse(DateToday) - DataInTable;
                                    var diffDays = Math.floor(Difrant / (1000 * 60 * 60 * 24));
                                    var diffYears = Math.floor(Difrant / (1000 * 60 * 60 * 24 * 365.25));
                                    var diffMonthes = Math.floor(Difrant / (1000 * 60 * 60 * 24 * 30));
                                    /** select spacific Cell index  index === 3*/
                                    if (index === 3) {
                                        $(chiled).css({
                                            background: "#ff9966",
                                            color: "white"
                                        });
                                        /** add since attrbute to row */
                                        $(chiled).parent().attr("since", diffDays);
                                        /** add class to make this elemnt corsur */
                                        $(chiled).addClass("cursor");
                                        /** add on click event to this cell */
                                        $(chiled).click(onCellClickAction);
                                    }
                                    /** in case the field was an date of birth */
                                    else if (index === 8) {
                                        if (datesPoints) {
                                            /** replace the point with slash */
                                            $(chiled).text($(chiled).text().replace(/[.]/g, "/"));
                                        }
                                        $(chiled).css({
                                            background: "#33cc33",
                                            color: "white"
                                        });
                                    }
                                }
                                /** add action to first cell in the table */
                                if (index === 0 && chiled.textContent !== "") {
                                    $(chiled).addClass(["costumerModalShow", "firstCell"]);
                                    /** add cell click event */
                                    $(chiled).click(onCellClickAction);
                                }
                            });

                        }
                    });

                    tableHead.append(tableHeader);
                    tableE.append(tableHead);
                    tableE.append(tableBody);

                    $(`#sheetsContainer`).append(tableE);
                }
            })
        };
        fileReader.readAsArrayBuffer(file);
        //var read = XLSX.read(file);
        //console.log(read);
        $('#uploadFileAccordion').accordion("close", 0);
    }
}
/** 
 * 
 */
function onSearchFieldsKeyDown(event) {
    var by = parseInt($(this).attr("by"));
    var tableRows = $(`.sheetsContainer table tbody tr`);

    if (tableRows.length === 0) {
        $('#uploadFileAccordion').accordion("open", 0);
        $(`#topFileUploaderSeciton`).transition('pulse');
        return false;
    }
    var interedValue = $(this).val().toLowerCase();
    if (event.keyCode === 13) {
        tableRows.each((i, row) => {
            $(row).find("td").each((i, cell) => {
                if (i === by) {
                    var cellValue = $(cell).text().toLowerCase();
                    var inclodes = cellValue.includes(interedValue);
                    var oldBackGround = $(row).css("background");
                    if (inclodes) {
                        $(row).css(SHOW_CSS_CLASS);
                        $(cell).transition({
                            animation: 'pulse',
                        });
                    } else {
                        $(row).css(HIDE_CSS_CLASS);
                    }
                }
            });
        });
        $(this).select();
    }
    if (interedValue === "") {
        tableRows.css(SHOW_CSS_CLASS);
    }
}
/** 
 * 
 */
function onSearchFieldFucosout(event) {
    var tableRows = $(`.sheetsContainer table tbody tr`);
    var by = parseInt($(this).attr("by"));

    tableRows.each((i, row) => {
        $(row).find("td").each((i, cell) => {
            if (i === by) {
                $(cell).addClass(SELECT_CLASS).removeClass(SELECT_CLASS);
            }
        });
    });
    if ($(this).val() === "") {
        tableRows.css(SHOW_CSS_CLASS);
    }
}
/**
 * 
 */
function onSearchFieldFucosIn(event) {
    var by = parseInt($(this).attr("by"));
    var tableRows = $(`.sheetsContainer table tbody tr`);
    if (tableRows.length === 0) {
        $('#uploadFileAccordion').accordion("open", 0);
        $(`#topFileUploaderSeciton`).transition('pulse');
        $(this).focusout();
        return false;
    }
    var interedValue = $(this).val().toLowerCase();
    tableRows.each((i, row) => {
        $(row).find("td").each((i, cell) => {
            if (i === by) {
                $(cell).removeClass(SELECT_CLASS).addClass(SELECT_CLASS);
            }
        });
    });

    if (interedValue === "") {
        tableRows.css(SHOW_CSS_CLASS);
    }
}
/** 
 * 
 */
var CHOOSED_ROW_TABLE = [];

function onCellClickAction(event) {
    var currentRow = event.target.parentElement;
    var rowID = currentRow.getAttribute("id");
    var cellsInRow = $(currentRow).find("td");
    var tableHeader = cellsInRow.closest("table").find("thead").find("tr").find("th");
    CHOOSED_ROW_TABLE = cellsInRow;

    var rowData = [];
    rowData[0] = "<div class='ui center aligned icon header'>-Customers data-</div>";
    cellsInRow.each((i, e) => {
        var cellBGcolor = $(e).css("background-color");
        if ($(e).text() !== "") {
            var style = `style="background:${cellBGcolor}; color : white;"`;
            if (cellBGcolor !== "rgba(0, 0, 0, 0)") {
                style = `style="background:${cellBGcolor}; color : white;"`;
            } else {
                style = `style=""`;
            }
            var spanE = `<span class="boldFont">${$(e).text()}</span>`;
            var pE = `<p ${style} >` + $(tableHeader[i]).text() + " : " + spanE + "</p>";
            rowData.push(pE);
        }
    });

    $(`#dinamicModalHeader`).html(`<h1>VP-Name : ${rowID}</h1>`);


    var gridPure = $(`<div class="ui two column grid stackable divided celled"></div>`);
    var gridRow = $(`<div class="row"></div>`);
    var leftSectionColumn = $(`<div class="column"></div>`);
    var rightSectionColumn = $(`<div class="column"></div>`);


    /** */
    leftSectionColumn.html(rowData);
    /**  */
    rightSectionColumn.html($(
        $(`<div class="ui form large" id="insertNewDataForm"></div>`)
        .append([
            $(`<div class="field"></div>`)
            .append([`<label>Kundennummer<label>`, `<input type="text" id="customer_number"/>`]),
            $(`<div class="field"></div>`)
            .append([`<label>Lieferdatum<label>`, `<input type="text" id="delivery_date" />`]),
            $(`<div class="field"></div>`)
            .append([`<label>Laufzeit des vertrags<label>`, `<input type="text" id="contracts_term" />`]),
            $(`<div class="field"></div>`)
            .append([`<label>hinweise<label>`, `<textarea rows="2" id="notes"></textarea>`])
        ])
    ));

    /** assign the grid left and right section to modal content */
    gridRow.html([leftSectionColumn, rightSectionColumn]);
    gridPure.html(gridRow);

    /** add modal actions buttons */
    var modalBtns = [
        `<div class="ui button cancel red">Close</div>`,
        `<div class="ui button ok green">Ok</div>`
    ];

    /** insert new elements to modal */
    $(`#dinamicModalAcitons`).html(modalBtns);
    $(`#dinamicModalContent`).html(gridPure);
    /** add modal properties */
    $(`#dinamicModal`).modal({
        closable: false,
        onShow: onInsertDataModalShow,
        onApprove: onInsertDataModalOnApprove,
        onDeny: onInsertDataModalOnDeny
    }).modal("show");

}

/** */
function onInsertDataModalShow(modal) {
    $("#delivery_date").unbind("datepicker");
    $("#delivery_date").datepicker({
        showButtonPanel: true,
    });
}
/** */
function onInsertDataModalOnApprove(modal) {
    var customer_number = $(`#customer_number`).val();
    var delivery_date = $("#delivery_date").datepicker({
        dateFormat: 'dd-mm-yyyy'
    }).val();
    var contracts_term = $(`#contracts_term`).val();
    var notes = $(`#notes`).val();
    if (customer_number === "" || delivery_date === "" || contracts_term === "") {
        $(`#customer_number`).closest(".ui.form").find(".field").addClass("error");
        return false;
    }else{

    }
    CHOOSED_ROW_TABLE.push();
}
/** */
function onInsertDataModalOnDeny(modal) {

}

var regularEx = {
    MobileWithCountryCode: /^([\+]?)([0-9]{1,4}?)[.\s-]?([0-9]{3,5}?)[.\s-]?([0-9]{4,10}?)$/i,
    PhoneNumberWithoutCode: "",
    EmailAddress: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/igm,
    dates: /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,
    datesPoints: /^\d{1,2}[.-\//]\d{1,2}[.-\//]\d{4}$/
}


/**
 * TO ADD
 * - Kundennummer
 * - Lieferdatum
 * - Laufzeit des vertrags
 * - hinweise
 */