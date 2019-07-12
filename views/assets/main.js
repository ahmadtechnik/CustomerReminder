var XLSX = require("xlsx");
var FS = require("fs");
var PATH = require("path");
//
$(document).ready(() => {
    //
    $(`.dropdown`).dropdown({
        onChange: onCellCleanerChange,
        onRemove: onRemoveSelectItem,
        clearable: true
    });
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
    //
    initStoredData()
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
    var thisBtn = this;
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

                    /**
                     * add new sheet object to json file
                     */
                    var sheetName = sheet["!ref"];
                    var sheetHeader = [];

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
                        /** write table head */
                        $(v).replaceWith(`<th hcell="${i}">${v.textContent}-${i}</th>`);
                        ColumnsIndexes[i] = $(v).text();
                        // push the header cells to header file
                        sheetHeader.push($(v).text());
                    });

                    // check if this sheet exist in the file
                    var F = createOrOpenFile("staticData.json");
                    if (F[sheetName] === undefined) {
                        F[sheetName] = {
                            tableHeader: sheetHeader
                        }
                        writeNewDataToFile("staticData.json", F);
                    } else {
                        // in case this sheet was exist in file
                    }

                    // append all rows without header
                    table.find("tbody").find("tr").each((index, row) => {
                        /** assign new attributes to row data */
                        if (index !== 0 && $(row).children().length > 0) {
                            $(row).attr("sheetName", sheet["!ref"]);
                            tableBody.append(row);
                            $(row).click(secounderyTableRowClick);
                        }
                        /** detect if row is empty */
                        var rowDR = $(row).find("td");
                        var rowDRDS = $(row).find("[t='z']");

                        if (rowDR.length === rowDRDS.length) {
                            row.remove()
                        } else {
                            /** set row id from index num 1 */
                            if ($(row).find("td")[1].textContent !== "") {
                                var otherRowWithSameID = $(`tr[id="${$(row).find("td")[1].textContent}"]`);
                                $(row).attr("id", $(row).find("td")[1].textContent);
                                // in case the same row exist in other table
                                if (otherRowWithSameID.length >= 1) {
                                    $(row).addClass("disabled");
                                }
                            }
                        }
                        /** detect all emails and phone numbers/Emails date of birth and */
                        if ($(row).children().length > 0 && index !== 0) {

                            var children = $(row).children();
                            /** each row cell */
                            children.each((index, chiled) => {
                                /** check number mach */
                                $(chiled).attr("cell", index);
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
                            addPopupContent(row);
                        }
                    });

                    tableHead.append(tableHeader);
                    tableE.append(tableHead);
                    tableE.append(tableBody);
                    var clearThisTableBtn = $(`<div class="ui button top attached red">Remove Table</div>`);
                    clearThisTableBtn.click(() => {
                        $(thisBtn).val("");
                        $(`#sheetsContainer`).html("");
                        $(thisBtn).change();
                    });
                    $(`#sheetsContainer`).append([clearThisTableBtn, tableE]);
                }
            });
        };
        fileReader.readAsArrayBuffer(file);
        //var read = XLSX.read(file);
        //console.log(read);
        $('#uploadFileAccordion').accordion("close", 0);
    } else {
        $(`#uploadedFileName`).text("No documents are listed for this customer.");
    }
    dateCellDetactor();
}
/** 
 * 
 */
function onSearchFieldsKeyDown(event) {
    var by = parseInt($(this).attr("by"));
    var tableRows = $(`.sheetsContainer table tbody tr`);

    if (tableRows.length === 0) {
        /** to check if the static data table is exist */
        var tableRows = $(`.oldDataStoredInStaticFile table tbody tr`);
        if (tableRows.length === 0) {
            $('#uploadFileAccordion').accordion("open", 0);
            $(`#topFileUploaderSeciton`).transition('pulse');
            return false;
        }
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
    if (tableRows.length === 0) {
        /** to check if the static data table is exist */
        var tableRows = $(`.oldDataStoredInStaticFile table tbody tr`);
        if (tableRows.length === 0) {
            $('#uploadFileAccordion').accordion("open", 0);
            $(`#topFileUploaderSeciton`).transition('pulse');
            return false;
        }
    }
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
        /** to check if the static data table is exist */
        var tableRows = $(`.oldDataStoredInStaticFile table tbody tr`);
        if (tableRows.length === 0) {
            $('#uploadFileAccordion').accordion("open", 0);
            $(`#topFileUploaderSeciton`).transition('pulse');
            return false;
        }
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
var CHOOSED_ROW_TABLE_ID = "";

function onCellClickAction(event) {
    var currentRow = event.target.parentElement;
    var rowID = currentRow.getAttribute("id");
    var cellsInRow = $(currentRow).find("td");
    var tableHeader = cellsInRow.closest("table").find("thead").find("tr").find("th");
    CHOOSED_ROW_TABLE_ID = rowID;

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
            .append([`<label>Lieferdatum<label>`, `<input type="text" id="delivery_date" readonly="readonly" />`]),
            $(`<div class="field"></div>`)
            .append([`<label>Laufzeit des vertrags <span class="redWhite">in Months</span><label>`, `<input type="text" id="contracts_term" />`]),
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
        onVisible: onInsertDataModalShow,
        onApprove: onInsertDataModalOnApprove,
        onDeny: onInsertDataModalOnDeny,
        onHidden: onInsertDataModalHidden
    }).modal("show");
}

/** */
function onInsertDataModalShow(modal) {
    $("#delivery_date").datepicker({
        dateFormat: 'dd/mm/yy'
    });
    $(`#dinamicModal`).modal("refresh");
}
/** */
function onInsertDataModalHidden(modal) {
    /** clear modal after close */
    $(`#dinamicModalHeader`).html(``);
    $(`#dinamicModalAcitons`).html("");
    $(`#dinamicModalContent`).html("");
    $("#delivery_date").datepicker("destroy");
}
/** */
function onInsertDataModalOnApprove(modal) {
    var customer_number = $(`#customer_number`).val();
    var delivery_date = $("#delivery_date").datepicker().val();
    var contracts_term = $(`#contracts_term`).val();
    var notes = $(`#notes`).val();
    if (customer_number === "" || delivery_date === "" || contracts_term === "") {
        var fields = $(`#customer_number`).closest(".ui.form").find(".field");
        fields.each((i, e) => {
            $(e).find("input").val() !== undefined && $(e).find("input").val() === "" ? $(e).addClass("error") : $(e).removeClass("error");
        });
        return false;
    } else {
        var oldDataStored = createOrOpenFile("staticData.json");
        var rowToWriteToFile = [];
        /** push the new values to row  */
        $(`#${CHOOSED_ROW_TABLE_ID} td`);
        var sheetname = $(`#${CHOOSED_ROW_TABLE_ID}`).attr("sheetname");
        $(`#${CHOOSED_ROW_TABLE_ID} td`).each((i, e) => {
            rowToWriteToFile.push($(e).text());
        });

        /** write new row to json file */
        rowToWriteToFile.push(customer_number, delivery_date, contracts_term, notes);
        // in case the sheet name was not exist in the table
        if (oldDataStored[sheetname] !== undefined) {
            /** compair header length with new entered data */
            var header = oldDataStored[sheetname]["tableHeader"];
            if (header.length < rowToWriteToFile.length) {
                oldDataStored[sheetname]["tableHeader"].push("Kundennummer", "Lieferdatum", "Vertragslaufzeit", "Notiz");
                console.log("New cell added to header of the table");
            }
            // in case the row was not exist in the sheet object
            if (oldDataStored[sheetname][CHOOSED_ROW_TABLE_ID] === undefined) {
                oldDataStored[sheetname][CHOOSED_ROW_TABLE_ID] = rowToWriteToFile;
                writeNewDataToFile("staticData.json", oldDataStored);
                console.log("New Row Added to sheet object");
                $(`#${CHOOSED_ROW_TABLE_ID}`).addClass("disabled");
            } else {
                // ask user if he would like to update the old data
                console.log("THIS ROW IS  EXIST IN STATIC FILE");
            }
        } else {
            /**
             * i have to ask user if he want to update the same existed data
             */
            console.log("SHEET NAME IS NOT DEFINED IN STATIC FILE");
        }

        initStoredData();
        return true;
    }

}
/** */
function onInsertDataModalOnDeny(modal) {

}

/** */
function createOrOpenFile(fileName) {
    var path = PATH.join(__dirname, "..", fileName);
    var fileExist = FS.existsSync(path);
    // in case was the json file exist
    if (fileExist) {
        return JSON.parse(FS.readFileSync(path, {
            encoding: "utf8"
        }));
    } else {
        // in case the file was not exist i have to create it again
        FS.writeFileSync(path, JSON.stringify({}), "utf8");
        createOrOpenFile(fileName);
    }
}
/** write new data to file */
function writeNewDataToFile(fileName, data) {
    var path = PATH.join(__dirname, "..", fileName);
    if (typeof data === "object") {
        FS.writeFileSync(path, JSON.stringify(data), "utf8");
    } else if (typeof data === "string") {
        FS.writeFileSync(path, data, "utf8");
    }
}

/** init the existed Data in table on app starts or page refreshed */
function initStoredData() {
    $(`#oldDataStoredInStaticFile`).html("");
    var F = createOrOpenFile("staticData.json");
    var length = Object.keys(F).length;
    var counter = 0;
    // each all sheets in static file
    $.each(F, (i, sheet) => {

        var sheetName = i;
        var table = $(`<table class="ui single line very compacttable table fixed" id="${sheetName}"></table>`);
        var tableHead = $(`<thead></thead>`);
        var tableBody = $(`<tbody></tbody>`);
        var containData = false;
        var tableHeader = sheet["tableHeader"];
        // each current sheet
        if (Object.keys(sheet).length > 1) {
            containData = true;
            $.each(sheet, (i, row) => {
                // in case was the current row the table header
                if (i === "tableHeader") {
                    var emptyTableRow = $(`<tr id="${sheetName}"></tr>`);
                    $.each(row, (i, v) => {
                        emptyTableRow.append(`<th cell="${i}" >${v}</th>`);
                        $(`#cellFilter`).append(`<option value="${i}">${v}</option>`);

                    });
                    tableHead.append(emptyTableRow);
                } else {
                    var emptyTableRow = $(`<tr class="" id="${i}" sheetName="${sheetName}" ></tr>`);
                    $.each(row, (i, v) => {
                        var datesPoints = v.match(regularEx.datesPoints);
                        if (datesPoints) {
                            /** replace the point with slash */
                            v.replace(/[.]/g, "/");
                        }
                        emptyTableRow.append(`<td hCell="${tableHeader[i]}" cell="${i}" >${v}</td>`);
                    });
                    // add popup to sub data row of the table
                    emptyTableRow.click(secounderyTableRowClick);
                    tableBody.append(emptyTableRow);
                    addPopupContent(emptyTableRow);
                }
            });

        }
        if (containData) {
            table.append([tableHead, tableBody]);
            $(`#oldDataStoredInStaticFile`).append(table);
            console.log("APEDDED")
        }
        counter++;
        /** in case the each loop finished it starts to emplimant other functions */
        if (length == counter) {
            // end each the sheets
            dateCellDetactor();
        }
    });
}

/** on dropdown menu selector */
function onCellCleanerChange(value, text, choice) {
    $(`[cell]`).css(HIDE_CSS_CLASS);
    $(`[cell='${value}']`).css(SHOW_CSS_CLASS);
    if (value === "") $(`[cell]`).css(SHOW_CSS_CLASS);
}

function onRemoveSelectItem(removedValue, removedText, $removedChoice) {
    $(`[cell='${removedValue}']`).css(HIDE_CSS_CLASS);
}

/** add popup to row free HTML code */
function addPopupContent(row) {
    var sheetName = $(row).attr("sheetName");
    $(row).popup({
        html: $(getCellNamesAsHTML()),
        inline: true,
        hoverable: true,
        transition: "zoom",
        delay: {
            show: 500,
            hide: 100
        },
        setFluidWidth: true,
    });

    function getCellNamesAsHTML() {
        var HTML = $(`<div class="ui segment inverted orange"></div>`);
        $(row).find("td").each((i, v) => {
            var h = $(v).attr("hCell") !== undefined ? $(v).attr("hCell") + " : " : ""
            var d = `<span class="blackWhite">${$(v).text()}</span>`;
            var line = $("<span calss='noPadding'>" + h + d + "</span>")
            HTML.append([line, "<br>"]);
        });
        return HTML;
    }

}

function dateCellDetactor() {
    var allCells = $(`[cell]`);
    var thisYear = new Date().getFullYear();
    var length = allCells.length;
    allCells.each((i, e) => {
        if ($(e).text().match(regularEx.dates) || $(e).text().match(regularEx.datesPoints)) {

            /** repace the sign in between the numbers to one modal */
            var replacedDate = $(e).text().replace(/[-\.-\//]/g, "-");
            var dateObject = new Date(replacedDate);

            var fixDate = replacedDate.split("-");
            // in case the year was only 2 digit
            if (dateObject.getFullYear()) {
                /** to add tow digit to first of the year */
                fixDate.forEach((v, i) => {
                    fixDate[i] = parseInt(v);

                });
                // in case was the date date of birth.
                if (fixDate[2] < 100) {
                    // in case was date of birth
                    if (fixDate[2] >= parseInt(thisYear.toString().substr(-2))) {
                        fixDate[2] = parseInt("19" + fixDate[2]);
                    }
                    // in case was date after 2000
                    else {
                        fixDate[2] = parseInt("20" + fixDate[2]);
                    }
                }
                $(e).text(fixDate.join("-"));
                replacedDate = fixDate.join("-");

            } else {
                fixDate.forEach((v, i) => {
                    fixDate[i] = parseInt(v);
                });
                $(e).text(fixDate.join("-"));
                replacedDate = fixDate.join("-")
            }
            var split = replacedDate.toString().split("-");
            var finalDate = new Date();
            finalDate.setFullYear(split[2]);
            finalDate.setMonth(split[1]);
            finalDate.setDate(split[0]);
            finalDate.setHours("00");
            finalDate.setMinutes("00");
            finalDate.setSeconds("00");

            var DateToday = new Date();
            var Difrant = Date.parse(DateToday) - finalDate;
            var diffDays = Math.floor(Difrant / (1000 * 60 * 60 * 24));
            var diffMonthes = Math.floor(Difrant / (1000 * 60 * 60 * 24 * 30));
            var diffYears = Math.floor(Difrant / (1000 * 60 * 60 * 24 * 365.25));

            $(e).css({
                background: "#ff9966",
                color: "white"
            });
            // re set the cell with new date
            $(e).text(replacedDate);
            $(e).attr("DO", true);
        }
        /** after finishing the each loop */
        if (length === i + 1) {
            compairTheDate();
        }
    });
}

/** to compair the rows */
function compairTheDate() {
    /** start to compair dates */
    var D = 19;
    var E = 20;
    var F = 1;
    var dateToday = new Date();
    var contracts_termColumn = $(`td[cell="${E}"]`);
    var delivery_dateColumn = $(`td[cell="${D}"]`);
    var order_numberColumn = $(`td[cell="${F}"]`);


    // each all cell which contain date
    delivery_dateColumn.each((i, D) => {
        var rowID = $(D).parent().attr("id");
        var delivery_date = $(D).text();
        var contracts_term = contracts_termColumn[i].textContent;
        // diffrance days in MS
        var contracts_termInMS = (contracts_term * 30) * (1000 * 60 * 60 * 24);
        var contracts_termInDay = (contracts_term * 30);
        var contracts_termInDMonth = contracts_term;
        var DA = Date.parse(dateToday) + contracts_termInMS;
        console.log(new Date(DA));
    });
}


/** the static file table row click action */
function secounderyTableRowClick(event) {
    console.log($(this).parent().parent());
    if (event.altKey && event.ctrlKey) {
        var F = createOrOpenFile("staticData.json");
        var sheetName = $(this).attr("sheetname");
        var rowID = $(this).attr("id");
        F[sheetName][$(this).attr("id")]
        delete F[sheetName][rowID];
        writeNewDataToFile("staticData.json", F);
        // i have to remove this object from file
        $(this).transition('zoom');
        if (Object.keys(F[sheetName]).length === 1) {
            $(this).parent().parent().remove();
        }
    }
}


/** age range > 6570 && < 36500 Days*/
/** Contracts term range 1095 . Alarm Range  */
var regularEx = {
    MobileWithCountryCode: /^([\+]?)([0-9]{1,4}?)[.\s-]?([0-9]{3,5}?)[.\s-]?([0-9]{4,10}?)$/i,
    PhoneNumberWithoutCode: "",
    EmailAddress: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/igm,
    dates: /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,
    datesPoints: /^\d{1,2}[-\.-\//]\d{1,2}[-\.-\//]\d{4}$/,

}

/**
 * TO ADD
 * - Kundennummer
 * - Lieferdatum
 * - Laufzeit des vertrags
 * - hinweise
 */