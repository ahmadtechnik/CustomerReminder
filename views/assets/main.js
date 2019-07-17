var XLSX = require("xlsx");
var FS = require("fs");
var PATH = require("path");
var MD = require("md5");
// add new funciton To jQuery 

$.eachSync = (obj, resu, end, start) => {

    start && start(obj);
    var objLength = Object.keys(obj).length;

    $.each(obj, (i, v) => {
        resu(i, v);
        objLength--;
        if (objLength <= 0) {
            if (end) {
                end(obj, i);
            }
        }
    });
}
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
    // $(`.sidebar`).sidebar("toggle");
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
var LOADING = ["ui", "segment", "loading"];
var FILEDATA = {};

function onFileUploadedAction() {
    var file = this.files[0];
    var thisBtn = this;
    $(`#seatchFieldsContainer`).html("");
    // in case was the file not equals undefined
    if (file !== undefined) {
        switch (file.type) {
            case "application/vnd.ms-excel":
                $(`#uploadedFileName`).text(file.name);
                var fileReader = new FileReader();

                fileReader.onload = (F) => {
                    var array8bit = new Uint8Array(F.target.result);
                    var xlsxFile = XLSX.read(array8bit, {
                        type: "array"
                    }).Sheets;

                    /**
                     * make sure the file is only one sheet 
                     *  in case the file was larger than one sheet
                     *  it should to be handled in other way.
                     * in case also the file was not empty or does not have any sheet
                     */
                    if (Object.keys(xlsxFile).length <= 1 && Object.keys(xlsxFile).length > 0) {
                        var F = createOrOpenFile("staticData.json");
                        // each file's sheets
                        $.eachSync(xlsxFile, (index, sheet) => {
                            var jsonSheet = XLSX.utils.sheet_to_json(sheet, {
                                raw: false,
                                //blankrows: false,
                            });

                            // check if this sheet exist in the file
                            var sheetName = MD(sheet["!ref"]);
                            var sheetHeader = Object.keys(jsonSheet[0]);

                            /** check if this sheet is created in static file before */
                            if (F[sheetName] === undefined) {
                                F[sheetName] = {
                                    tableHeader: sheetHeader
                                }
                                writeNewDataToFile("staticData.json", F);
                            }
                            /**  create row hash */
                            $.eachSync(jsonSheet, (i, row) => {
                                jsonSheet[i]["hash"] = MD(Object.values(row).join("-"));
                            }, () => {
                                FILEDATA[sheetName] = jsonSheet;
                            });

                            /** create search fields as long as the header of the CSV file */
                            $.eachSync(sheetHeader, (i, e) => {
                                /** 
                                 * in this block i am adding all avalible search fields
                                 * to make the user able to select search method totaly free
                                 *  */
                                var fieldDiv = $(`<div class="field" by="${e}"></div>`);
                                fieldDiv.css(HIDE_CSS_CLASS);
                                var label = $(`<label>Search By : ${e}</label>`);
                                var input = $(`<input type="text" placeholder="${e}" by="${e}" class="selectByToShow"/>`);
                                /** add keydown Action for this input field */
                                input.keydown(searchMethods.onKeyDownSearchField);
                                input.keyup(searchMethods.onKeyUpSearchField);
                                /** append the elements to field div */
                                fieldDiv.append([label, input]);
                                $(`#seatchFieldsContainer`).append(fieldDiv);
                            }, (sheetHeader) => {
                                /** add the select menu of choosing the search method */
                                var selectByToShow = $(`<select class="ui dropdown"></select>`);
                                selectByToShow.append(`<option value="0">Please Select</option>`);
                                $.eachSync(sheetHeader, (i, e) => {
                                    selectByToShow.append(`<option value="${e}">${e}</option>`);
                                });
                                var divField = $(`<div class="field"></div>`);
                                divField.append([
                                    $(`<label>Select Column to search by</label>`),
                                    selectByToShow
                                ]);
                                $(`#seatchFieldsContainer`).append(divField);
                                selectByToShow.dropdown({
                                    onChange: onSearchMethodSelector
                                });
                            })
                        }, (xlsxFile) => {
                            //$(`#sheetsContainer`).html();
                            $('#uploadFileAccordion').accordion("close", 0);
                        });
                        // end each the file's sheets
                        $(`body`).removeClass(LOADING);
                    };
                }
                fileReader.onprogress = (FileReader, ProgressEvent) => {

                };
                fileReader.onloadstart = () => {
                    $(`#sheetsContainer`).html("");
                    $(`body`).addClass(LOADING);
                    FILEDATA = {};
                }
                fileReader.readAsArrayBuffer(file);
                break;
        }

    } else {
        $(`#uploadedFileName`).text("No documents are listed for this customer.");
    }
    dateCellDetactor();
}

var searchMethods = {
    onKeyDownSearchField: (event) => {
        // user searching by
        var by = $(event.target).attr("by");
        var value = $(event.target).val().toLowerCase();
        var foundedRows = [];
        if (event.keyCode === 13) {
            if (value !== "") {
                var sheetHash
                $.eachSync(FILEDATA, (i, sheet) => {
                    sheetHash = i;

                    $.eachSync(sheet, (i, row) => {
                        if (row[by] !== undefined) {
                            if (row[by].toLowerCase() === value) {
                                foundedRows.push(row);
                            }
                        }
                    }, (sheet) => {});
                }, (FILEDATA) => {
                    /** each founded rows */
                    if (foundedRows.length < 50 && foundedRows.length > 0) {
                        var tableHeader = Object.keys(FILEDATA[Object.keys(FILEDATA)[0]][0]);
                        $(`#sheetsContainer`).html("");
                        // create new table
                        var tableE = $(`<table class="ui celled single line striped  table"></table>`);
                        var tableHead = $(`<thead></thead>`);
                        var trHead = $(`<tr></tr>`);
                        var tableBody = $(`<tbody></tbody>`);
                        /** each search table result header */
                        $.eachSync(tableHeader, (i, cell) => {
                                cell !== "hash" ? trHead.append(`<th>${cell}</th>`) : "";
                            }
                            // after finisheing add the header
                            , (tableHeader) => {
                                /** each result rows */
                                $.eachSync(foundedRows, (i, row) => {
                                    var tableBodyRow = $(`<tr id="${foundedRows[i]["hash"]}" sheetHash="${sheetHash}"></tr>`);
                                    /** each row cells */
                                    var counter = 0;
                                    /** add on click on the row  */
                                    
                                    $.eachSync(row, (i, cell) => {
                                        i !== "hash" ? tableBodyRow.append(`<td cell="${counter}">${cell}</td>`) : "";
                                        i !== "hash" ? counter++ : "";
                                    }, (row) => {
                                        tableBody.append(tableBodyRow);
                                        tableHead.append(trHead);
                                        tableE.append([tableHead, tableBody]);
                                        $(`#sheetsContainer`).html(tableE);
                                        tableBodyRow.click(onCellClickAction);
                                        dateCellDetactor();
                                    });
                                });
                            });

                        /** remove error color from element */
                        $(event.target).parent().removeClass("error");
                    } else if (foundedRows.length === 0) {
                        /** add error color to field eleemnt */
                        $(event.target).parent().addClass("error");
                        $(`#sheetsContainer`).html("");
                    } else {
                        /**  */
                        $(event.target).parent().removeClass("error");
                        alert("please specify your search word");
                        $(`#sheetsContainer`).html("");
                    }
                });
            }
        }
    },
    onKeyUpSearchField: () => {

    }
}

/** 
 * 
 */
function onSearchFieldFucosout() {
    return;
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

    return;
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
                var scrolled = $(cell).closest("div").scrollLeft();
                var offsetOfCell = $(cell).offset().left;
                $(cell).closest("div").scrollLeft((offsetOfCell / 2) + $(cell).width());
            }
        });

    });
    //
    if (interedValue === "") {
        tableRows.css(SHOW_CSS_CLASS);
    }
}
/** 
 * 
 */
var CHOOSED_ROW_TABLE_ID = "";

function onCellClickAction(event) {

    var currentRow = this;
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
        $(`.sheetsContainer #${CHOOSED_ROW_TABLE_ID} td`);
        var sheetname = $(`#${CHOOSED_ROW_TABLE_ID}`).attr("sheetHash");
        $(`.sheetsContainer #${CHOOSED_ROW_TABLE_ID} td`).each((i, e) => {
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
                $(`.sheetsContainer #${CHOOSED_ROW_TABLE_ID}`).addClass("disabled");
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
function onInsertDataModalOnDeny(modal) {
    
}
/** row hashing */
var hashing = {
    fromString: function generateHashFromString(params) {

    }
}

/** */
function createOrOpenFile(fileName) {
    var path = PATH.join(__dirname, "..", fileName);
    var fileExist = FS.existsSync(path);
    // in case was the json file exist
    if (fileExist) {
        return JSON.parse(FS.readFileSync(path, {
            encoding: "UTF-8"
        }));
    } else {
        // in case the file was not exist i have to create it again
        FS.writeFileSync(path, JSON.stringify({}), "UTF-8");
        createOrOpenFile(fileName);
    }
}

/** write new data to file */
function writeNewDataToFile(fileName, data) {
    var path = PATH.join(__dirname, "..", fileName);
    if (typeof data === "object") {
        FS.writeFileSync(path, JSON.stringify(data), {
            encoding: "UTF-8"
        });
    } else if (typeof data === "string") {
        FS.writeFileSync(path, data, {
            encoding: "UTF-8"
        });
    }
}

/** init the existed Data in table on app starts or page refreshed */
var STATICFILEROWS = [];

function initStoredData() {
    $(`#oldDataStoredInStaticFile`).html("");
    var F = createOrOpenFile("staticData.json");
    var length = Object.keys(F).length;
    var counter = 0;
    var table = $(`<table class="ui single line table striped " id=""></table>`);
    var tableHead = $(`<thead></thead>`);
    var tableBody = $(`<tbody></tbody>`);
    var headerAdded = false;

    // each all sheets in static file
    $.eachSync(F, (i, sheet) => {
        STATICFILEROWS.push(sheet);
        var sheetName = i;
        var containData = false;
        var tableHeader = sheet["tableHeader"];
        // each current sheet
        if (Object.keys(sheet).length > 1) {
            var headerLength = Object.keys(F[sheetName]["tableHeader"]).length;
            containData = true;
            $.each(sheet, (i, row) => {
                // in case was the current row the table header
                if (i === "tableHeader") {
                    if (!headerAdded) {
                        var emptyTableRow = $(`<tr id="${sheetName}"></tr>`);
                        $.each(row, (i, v) => {
                            emptyTableRow.append(`<th cell="${i}" >${v}</th>`);
                            $(`#cellFilter`).append(`<option value="${i}">${v}</option>`);
                        });
                        tableHead.append(emptyTableRow);
                        headerAdded = true;
                    }
                    /** in case the header of secoundery table was drawed */
                    else {}
                } else {
                    var emptyTableRow = $(`<tr class="" id="${i}" sheetName="${sheetName}" ></tr>`);
                    var rowTableBodyLength = Object.keys(row).length;
                    /** 
                     * in case header length was not equals to table row body length 
                     * here should be other to this row
                     */
                    if (rowTableBodyLength !== headerLength) {
                        emptyTableRow =
                            $(`<tr class="columnMerged" id="${i}" sheetName="${sheetName}" >
                            <td colspan="${headerLength}">${row.join(" # ")}</td>
                            </tr>`);
                        tableBody.append(emptyTableRow);
                        emptyTableRow.click(secounderyTableRowClick);
                    } else {
                        /**
                         * each rows which are not table body
                         */
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
                }
            }, () => {

            });

        }
        if (containData) {
            table.append([tableHead, tableBody]);
            $(`#oldDataStoredInStaticFile`).append(table);
        }
        counter++;
        /** in case the each loop finished it starts to emplimant other functions */
        if (length == counter) {
            // end each the sheets
            dateCellDetactor();
        }
    }, (obj) => {
        table.append([tableHead, tableBody]);
        $(`#oldDataStoredInStaticFile`).append(table);
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
    return false;
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
    var D = 18;
    var E = 19;
    var F = 1;
    var dateToday = new Date();
    var contracts_termColumn = $(`#oldDataStoredInStaticFile td[cell="${E}"]`);
    var delivery_dateColumn = $(`#oldDataStoredInStaticFile td[cell="${D}"]`);
    var order_numberColumn = $(`#oldDataStoredInStaticFile td[cell="${F}"]`);
    /** start append the new column to the parent table */
    var parentTable = $(contracts_termColumn).closest("table");


    if (parentTable.find("thead").find("tr").find("[cell='-1']").length < 1) {
        parentTable.find("thead").find("tr").append("<th class='importantHeader' cell='-1'>IMP</th>");
    } else {

    }

    // each all cell which contain date
    delivery_dateColumn.each((i, D) => {
        var rowID = $(D).parent().attr("id");
        var checkIfCellExist = $(`#oldDataStoredInStaticFile #${rowID}`).find(`td[hCell='IMP']`);
        /** in case was the cell which contain the leaft time on */
        if (checkIfCellExist.length < 1) {
            var v = new Date();

            var delivery_date = $(D).text().split("-");
            var day = parseInt(delivery_date[0]);
            var month = parseInt(delivery_date[1]);
            var year = parseInt(delivery_date[2]);
            var dToDateObject = new Date(year + "-" + month + "-" + day);

            var contracts_term = contracts_termColumn[i].textContent;
            // diffrance days in MS
            var contracts_termInMS = (contracts_term * 30) * (1000 * 60 * 60 * 24);
            var contracts_termInDay = (contracts_term * 30);
            var contracts_termInDMonth = contracts_term;

            var DA = Date.parse(dateToday) + contracts_termInMS;
            var leaft = DA - Date.parse(dateToday);

            // Date between term and 
            var DBTaDD = Math.floor((Date.parse(dateToday) - Date.parse(dToDateObject)) / (1000 * 60 * 60 * 24));


            var leaftD = leaft / (1000 * 60 * 60 * 24) - DBTaDD;
            var leaftM = leaft / (1000 * 60 * 60 * 24 * 30);
            // in case the contract is not starts yet

            if (DBTaDD < 0) {
                var td = $(`<td hCell="IMP" >${Math.abs(DBTaDD)} T</td>`);
                $(`#oldDataStoredInStaticFile #${rowID}`).append(td);
            } else {
                var td = $(`<td hCell="IMP">${leaftD} D</td>`);
                $(`#oldDataStoredInStaticFile #${rowID}`).append(td);
            }
            // to detect soon finishing term of any cotract
            if (leaftD > 90 && leaftD <= 180) {
                td.addClass("WORN");
            } else if (leaftD < 90 && leaftD > 0) {
                td.addClass("DENG");
                td.transition('set looping').transition('pulse', '500ms');
            } else if (leaftD > 180) {
                td.addClass("POSITIVE");
            } else if (leaftD < 0) {
                td.text(`${Math.abs(leaftD)} D ago`);
                td.addClass("DENGL2");
                td.transition('set looping').transition('pulse', '500ms');
            }

            addPopupContent($(`#${rowID}`));
        } else {
            /** in case the column of IMP data is exist or not */
        }

    });
    appendedOne = true;

}


/** the static file table row click action */
function secounderyTableRowClick(event) {
    if (event.altKey && event.ctrlKey) {
        var F = createOrOpenFile("staticData.json");
        var sheetName = $(this).attr("sheetname");
        var rowID = $(this).attr("id");
        F[sheetName][$(this).attr("id")]
        delete F[sheetName][rowID];
        writeNewDataToFile("staticData.json", F);
        // i have to remove this object from file
        $(this).transition({
            animation: 'horizontal flip',
            onComplete: () => {
                $(this).remove();
                $(`#uploadeFileHiddenBtn`).change();
            }
        });
        if (Object.keys(F[sheetName]).length === 1) {
            $(this).parent().parent().transition({
                animation: 'horizontal flip',
                onComplete: () => {
                    $(this).parent().parent().remove();
                    $(`#uploadeFileHiddenBtn`).change();
                }
            })
        }
    }
    /** in case user does not press both alt keys */
    else {

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

function onSearchMethodSelector(item) {
    $(`div[by]`).find("input").val("");
    $(`div[by]`).removeClass("error")
    $(`div[by]`).css(HIDE_CSS_CLASS);
    $(`div[by='${item}']`).css(SHOW_CSS_CLASS);
}

/**
 * TO ADD
 * - Kundennummer
 * - Lieferdatum
 * - Laufzeit des vertrags
 * - hinweise
 */
