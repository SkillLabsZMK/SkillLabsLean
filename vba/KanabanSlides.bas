Attribute VB_Name = "KanabanSlides"
Option Explicit

Dim numberList As Collection
Dim pptApp As PowerPoint.Application
Dim pptPres As PowerPoint.Presentation
Dim pptSlide As PowerPoint.Slide
Dim frontLayout As Object
Dim backsideLayout As Object
Dim slideIndex As Long
Dim row As ListRow
Dim red As Long
Dim green As Long
Dim blue As Long

' Adjust these if the template's margins/card size/grid change.
Private Const VIS_CardWidthCm As Double = 8.5
Private Const VIS_CardHeightCm As Double = 5.4
Private Const VIS_MarginLeftCm As Double = 1.4
Private Const VIS_MarginTopCm As Double = 1.3
Private Const VIS_ColGapCm As Double = 1
Private Const VIS_Cols As Long = 2
Private Const VIS_Rows As Long = 5

' Duplex mode of the printer used for the Visitenkarten sheets.
'   True  = "Lange Kante spiegeln" (flip on long edge, the usual default)
'   False = "Kurze Kante spiegeln" (flip on short edge)
' The card artwork on the VIS slides is rotated by 90 degrees (the card is read in
' portrait orientation although the slide is landscape). Therefore:
'   long edge  -> columns mirrored AND back image rotated by 180 degrees
'   short edge -> rows mirrored, no rotation
' Back positions are mirrored around the real slide size, so asymmetric margins
' (1.4 cm left vs. 1.6 cm right on a 21 cm wide A4 page) no longer shift the back.
Private Const VIS_FlipLongEdge As Boolean = True


' Called from every Sub's error handler label.
' Shows a message box with the failing procedure's name plus the error number/description,
' so problems are visible immediately instead of VBA silently breaking or showing a generic
' runtime error dialog.
Private Sub HandleError(procName As String)

    MsgBox "Ein Fehler ist aufgetreten in '" & procName & "':" & vbCrLf & vbCrLf & _
           "Fehlernummer: " & Err.Number & vbCrLf & _
           "Beschreibung: " & Err.Description, _
           vbCritical, "Kanban Generator - Fehler"

End Sub


' Converts a centimeter value to PowerPoint points (72 pt / 2.54 cm per inch)
Private Function CmToPt(cm As Double) As Single
    CmToPt = cm * 72 / 2.54
End Function


' Returns the product image file name (e.g. "Image_12.png") for a table row.
'
' The image files are named after the table row index (row.Index, see
' GroupImg.btnOK_Click / UpdateImgNames), and that name is stored in the column
' "Produktbild". Column 1 ("Nr") must NOT be used for this: AdaptRowIndex numbers
' only the VISIBLE rows (hidden/filtered rows get 0), so with an active filter
' "Nr" and row.Index differ and the image of a different product would be used.
Private Function ProductImageName(row As ListRow) As String

    Dim imgName As String
    Dim imgCol As Long

    On Error Resume Next
    imgCol = row.Parent.ListColumns("Produktbild").Index
    On Error GoTo 0
    If imgCol = 0 Then imgCol = 17 ' fallback: column Q

    imgName = Trim(CStr(row.Range.Cells(imgCol).Value))

    ' Row without stored name: fall back to the naming convention
    If imgName = "" Then imgName = "Image_" & row.Index & ".png"

    ProductImageName = imgName

End Function


' Switches bullets off for every text placeholder of a slide.
' The VIS template layouts only disable bullets on the layout's prompt text, not in
' the placeholder's list style, so new slides inherit the master's bullet ("•").
Private Sub RemoveBullets_VIS(pptSlide As Object)

    On Error GoTo ErrHandler

    Dim i As Long

    With pptSlide.Shapes
        For i = 1 To .Placeholders.Count
            If .Placeholders(i).HasTextFrame Then
                .Placeholders(i).TextFrame.TextRange.ParagraphFormat.Bullet.Visible = msoFalse
            End If
        Next i
    End With

    Exit Sub

ErrHandler:
    Call HandleError("RemoveBullets_VIS")

End Sub


' Opens the given folder in Windows Explorer. Used at the end of the whole process so the user lands directly on the generated PDFs.
Private Sub OpenFolderInExplorer(folderPath As String)

    On Error GoTo ErrHandler

    If Right(folderPath, 1) <> "\" Then folderPath = folderPath & "\"

    If Dir(folderPath, vbDirectory) = "" Then MkDir folderPath

    Shell "explorer.exe " & Chr(34) & folderPath & Chr(34), vbNormalFocus

    Exit Sub

ErrHandler:
    Call HandleError("OpenFolderInExplorer")

End Sub


' Entry point: generates cards for BOTH formats (A6 first, then VIS/Visitenkarte)
Sub ChooseMaterialsCombined()
    
    On Error GoTo ErrHandler

    Dim tbl As ListObject
    Set tbl = ThisWorkbook.Sheets("Kanban").ListObjects(1)
    
    Debug.Print "ChooseMaterialsCombined: start at " & Now

    ' Ask the user which row numbers/ranges to process
    Set numberList = New Collection
    InputRange

    ' User cancelled or entered nothing
    If numberList.Count = 0 Then
        Exit Sub
    End If

    ' Generate A6 cards for any selected rows tagged "A6"
    Call ProcessFormat(tbl, "A6")

    ' Generate Visitenkarte cards for any selected rows tagged "VIS"
    Call ProcessFormat(tbl, "VIS")
    
    ' Every presentation opened along the way has already been saved and closed individually.
    Dim waitUntil As Single
    waitUntil = Timer + 0.5
    Do While Timer < waitUntil
        DoEvents
    Loop

    On Error Resume Next
    If Not pptApp Is Nothing Then pptApp.Quit
    Set pptApp = Nothing
    On Error GoTo ErrHandler

    Debug.Print "ChooseMaterialsCombined: done"

    MsgBox "Alle Kanban-Karten (A6 + Visitenkarte) wurden erfolgreich erstellt!", vbInformation, "Kanban Generator"
    
    Call OpenFolderInExplorer(BasisPfad & "KanbanSlides_PDF")

    Exit Sub
    
ErrHandler:
    Call HandleError("ChooseMaterialsCombined")
    
End Sub


' Checks whether at least one selected row matches the given format,
' and if so, delegates to the format-specific Run routine.
Private Sub ProcessFormat(tbl As ListObject, formatTyp As String)

    On Error GoTo ErrHandler
    
    Dim i As Long
    Dim val As Long
    Dim found As Boolean
    found = False

    For Each row In tbl.ListRows
        val = row.Range.Cells(1).Value

        For i = 1 To numberList.Count
            If val = numberList(i) Then
                If Trim(UCase(row.Range.Cells(16).Value)) = formatTyp Then
                    found = True
                End If
                Exit For ' row number matched something in numberList, no need to check further numbers
            End If
        Next i

    ' at least one matching row+format found, stop scanning
        If found Then Exit For
    Next row

    '  nothing to do for this format, skip opening PowerPoint entirely
    If Not found Then
        Debug.Print "ProcessFormat: no matching '" & formatTyp & "' rows selected, skipping"
        Exit Sub
    End If

    If formatTyp = "A6" Then
        Call RunA6(tbl)
    ElseIf formatTyp = "VIS" Then
        Call RunVIS(tbl)
    End If
    
    Exit Sub

ErrHandler:
    Call HandleError("ProcessFormat")

End Sub


' Opens the A6 PowerPoint template, generates one front+back slide pair
' per matching row, then exports the whole deck as PDF.
Private Sub RunA6(tbl As ListObject)

    On Error GoTo ErrHandler
    
    Dim i As Long
    Dim val As Long
    Dim pdfPath As String
    Dim folderPath As String
    
    Debug.Print "RunA6: start"

    ' Reuse an already-open PowerPoint instance if one exists, otherwise start a new one
    On Error Resume Next
    Set pptApp = GetObject(, "PowerPoint.Application")
    If pptApp Is Nothing Then Set pptApp = CreateObject("PowerPoint.Application")
    On Error GoTo ErrHandler

    pptApp.Visible = True

    ' Open the A6 template (":: Kanban ::" section syntax preserves the section name)
    Set pptPres = pptApp.Presentations.Open(Filename:=BasisPfad & "KanbanSlidesA6.pptx::Kanban::", ReadOnly:=msoFalse, WithWindow:=msoTrue, Untitled:=msoTrue)

    ' Save immediately under a timestamped name so we never overwrite the template
    Dim newFileName As String
    newFileName = BasisPfad & "KanbanSlides_PPTX\Saved_A6_" & Format(Now, "yyyymmdd_HHMMSS") & ".pptx"

    pptPres.SaveAs newFileName
    
    pptApp.ActiveWindow.ViewType = 1

    ' Layout 1 = front of card, Layout 2 = back of card (defined in the template's slide master)
    Set frontLayout = pptPres.Designs(1).SlideMaster.CustomLayouts(1)
    Set backsideLayout = pptPres.Designs(1).SlideMaster.CustomLayouts(2)

    ' Template ships with 2 sample slides; new cards are inserted starting at position 3
    slideIndex = 3

    ' Loop through Excel rows - A6
    For Each row In tbl.ListRows
        val = row.Range.Cells(1).Value

        For i = 1 To numberList.Count
            If val = numberList(i) Then
                If Trim(UCase(row.Range.Cells(16).Value)) = "A6" Then
                    Call CreateCanbanSlides_A6(tbl, row)
                End If
                Exit For
            End If
        Next i
    Next row

    ' Delete sample slides
    pptPres.Slides(2).Delete
    pptPres.Slides(1).Delete

    folderPath = BasisPfad & "KanbanSlides_PDF\"
    If Dir(folderPath, vbDirectory) = "" Then MkDir folderPath

    pdfPath = folderPath & "KanbanSlides_A6_" & Format(Now, "dd-mm-yy_hh-nn") & ".pdf"

    ' Export the final A6 deck as a print-ready PDF
    pptPres.ExportAsFixedFormat _
        Path:=pdfPath, _
        FixedFormatType:=ppFixedFormatTypePDF, _
        Intent:=ppFixedFormatIntentPrint
        
    pptPres.Save
    pptPres.Close
    
    Debug.Print "RunA6: done, exported " & pdfPath
    
    Exit Sub

ErrHandler:
    Call HandleError("RunA6")

End Sub


' Builds one A6 front+back slide pair for a single product row
Private Sub CreateCanbanSlides_A6(tbl As ListObject, row As ListRow)

    On Error GoTo ErrHandler
    
    Dim supportTbl As ListObject
    Dim kostenstelleTbl As ListObject

    Set supportTbl = ThisWorkbook.Sheets("Hilfstabellen").ListObjects("Einkauf")
    Set kostenstelleTbl = ThisWorkbook.Sheets("Hilfstabellen").ListObjects("Kostenstelle")

    ' Front side
    Set pptSlide = pptPres.Slides.AddSlide(slideIndex, frontLayout)

    With pptSlide.Shapes
        Call AdaptLayoutColor_A6(supportTbl, row, pptSlide)

        .Placeholders(1).TextFrame.TextRange.Text = row.Range.Cells(2).Value

        Call AddData_A6(kostenstelleTbl, row, pptSlide, tbl)
        
        Dim bildName As String
        Dim imgSaveFolder As String

        imgSaveFolder = BasisPfad & "ProductImages\"
        bildName = ProductImageName(row) ' from column "Produktbild", not from "Nr"
        Call InsertImage_A6(imgSaveFolder, bildName, pptSlide, pptPres)

    End With

    slideIndex = slideIndex + 1

    ' Back side
    Set pptSlide = pptPres.Slides.AddSlide(slideIndex, backsideLayout)

    Call AdaptLayoutColor_A6(supportTbl, row, pptSlide)

    slideIndex = slideIndex + 1
    
    Exit Sub

ErrHandler:
    Call HandleError("CreateCanbanSlides_A6")

End Sub


' Fills in all the text placeholders on the front of an A6 card
Private Sub AddData_A6(supportTbl2 As ListObject, row As ListRow, pptSlide As Object, tbl As ListObject)
    
    On Error GoTo ErrHandler
    
    Dim supportTbl2Row As ListRow

    With pptSlide.Shapes

        ' Look up the "Kostenstelle"
        For Each supportTbl2Row In supportTbl2.ListRows
            If Trim(CStr(supportTbl2Row.Range.Cells(1).Value)) = Trim(CStr(row.Range.Cells(7).Value)) Then
                .Placeholders(5).TextFrame.TextRange.Text = supportTbl2Row.Range.Cells(2).Value
                Exit For
            End If
        Next supportTbl2Row

        ' Static labels, pulled from the Excel table's header row
        .Placeholders(3).TextFrame.TextRange.Text = tbl.HeaderRowRange.Cells(15).Value & ": " & row.Range.Cells(15).Value
        .Placeholders(4).TextFrame.TextRange.Text = tbl.HeaderRowRange.Cells(7).Value
        .Placeholders(6).TextFrame.TextRange.Text = tbl.HeaderRowRange.Cells(8).Value
        .Placeholders(8).TextFrame.TextRange.Text = tbl.HeaderRowRange.Cells(13).Value
        .Placeholders(9).TextFrame.TextRange.Text = tbl.HeaderRowRange.Cells(11).Value
        .Placeholders(10).TextFrame.TextRange.Text = tbl.HeaderRowRange.Cells(3).Value
        .Placeholders(14).TextFrame.TextRange.Text = tbl.HeaderRowRange.Cells(9).Value
        .Placeholders(16).TextFrame.TextRange.Text = tbl.HeaderRowRange.Cells(5).Value
        .Placeholders(18).TextFrame.TextRange.Text = tbl.HeaderRowRange.Cells(10).Value
        .Placeholders(20).TextFrame.TextRange.Text = tbl.HeaderRowRange.Cells(4).Value

        ' Actual values for this specific product row
        .Placeholders(7).TextFrame.TextRange.Text = row.Range.Cells(8).Value
        .Placeholders(11).TextFrame.TextRange.Text = row.Range.Cells(13).Value & " " & row.Range.Cells(14).Value
        .Placeholders(12).TextFrame.TextRange.Text = row.Range.Cells(11).Value & " " & row.Range.Cells(12).Value
        .Placeholders(13).TextFrame.TextRange.Text = row.Range.Cells(3).Value
        .Placeholders(15).TextFrame.TextRange.Text = row.Range.Cells(9).Value
        .Placeholders(17).TextFrame.TextRange.Text = row.Range.Cells(5).Value
        .Placeholders(19).TextFrame.TextRange.Text = row.Range.Cells(10).Value

        ' Barcode-style representation of the product number, rendered in a barcode font
        .Placeholders(21).TextFrame.TextRange.Text = row.Range.Cells(4).Value
        .Placeholders(21).TextFrame.TextRange.Font.Name = "Libre Barcode 39 Text"

    End With
    
    Exit Sub

ErrHandler:
    Call HandleError("AddData_A6")

End Sub


' Colors the card's placeholders according to the purchasing ("Einkauf") category
Private Sub AdaptLayoutColor_A6(supportTbl As ListObject, row As ListRow, pptSlide As Object)

    On Error GoTo ErrHandler
    
    Dim layoutColor As Long
    Dim supportTblRow As ListRow

    Set supportTbl = ThisWorkbook.Sheets("Hilfstabellen").ListObjects("Einkauf")

    layoutColor = 0
    For Each supportTblRow In supportTbl.ListRows
        If supportTblRow.Range.Cells(1).Value = row.Range.Cells(6).Value Then
            layoutColor = supportTblRow.Range.Cells(2).Interior.Color
            Exit For
        End If
    Next supportTblRow

    ' Decompose the OLE color value into its R/G/B components
    red = layoutColor Mod 256
    green = (layoutColor \ 256) Mod 256
    blue = (layoutColor \ 256 \ 256) Mod 256

    With pptSlide.Shapes
        ' Front layout has placeholder 2 for the title, back layout falls back to placeholder 1
        If .Placeholders.Count >= 2 Then
            .Placeholders(2).TextFrame.TextRange.Text = "Kanban Einkauf " & row.Range.Cells(6).Text
        ElseIf .Placeholders.Count >= 1 Then
            .Placeholders(1).TextFrame.TextRange.Text = "Kanban Einkauf " & row.Range.Cells(6).Text
        End If

        ' Apply the category color to every colored placeholder box on this slide
        Dim i As Variant
        For Each i In Array(2, 4, 6, 8, 9, 10, 14, 16, 18, 20)
            If .Placeholders.Count >= i Then
                .Placeholders(i).Fill.ForeColor.RGB = RGB(red, green, blue)
            End If
        Next i
    End With
    
    Exit Sub

ErrHandler:
    Call HandleError("AdaptLayoutColor_A6")

End Sub

' Inserts the product image (if it exists) into the front of an A6 card,
' centered horizontally and fixed to a specific vertical position/height.
Private Sub InsertImage_A6(saveFolder As String, imgName As String, pptSlide As Object, pptPres As Object)
    
    On Error GoTo ErrHandler
    
    Dim img As Object
    Dim imgFile As String

    imgFile = saveFolder & imgName

    If imgName <> "" And Dir(imgFile) <> "" Then
        Set img = pptSlide.Shapes.AddPicture(Filename:=imgFile, _
                                             LinkToFile:=msoFalse, _
                                             SaveWithDocument:=msoTrue, _
                                             Left:=0, Top:=0, _
                                             Width:=-1, Height:=-1)
        
        ' Position/scale the image into its designated spot on the card
        With img
            .Top = 2.1 * 72 / 2.54
            .LockAspectRatio = msoTrue
            .Height = 3.9 * 72 / 2.54
            .Left = (pptPres.PageSetup.SlideWidth - .Width) / 2 ' Center horizontally
        End With
    Else
        Exit Sub ' No image found for this product - skip silently
    End If
    
    Exit Sub

ErrHandler:
    Call HandleError("InsertImage_A6")

End Sub


' Opens the VIS template, generates one front+back slide pair per matching row,
' exports the slides as individual EMF images, and hands them off to Word.
Private Sub RunVIS(tbl As ListObject)
    
    On Error GoTo ErrHandler
    
    Dim i As Long
    Dim val As Long
    
    Debug.Print "RunVIS: start"
    
    On Error Resume Next
    Set pptApp = GetObject(, "PowerPoint.Application")
    If Err.Number <> 0 Or pptApp Is Nothing Then
        Err.Clear
        Set pptApp = Nothing
        Set pptApp = CreateObject("PowerPoint.Application")
    End If
    On Error GoTo ErrHandler

    pptApp.Visible = True

    Set pptPres = pptApp.Presentations.Open(Filename:=BasisPfad & "KanbanSlides_Visitenkarte.pptx::Kanban::", _
                                                        ReadOnly:=msoFalse, _
                                                        WithWindow:=msoTrue, _
                                                        Untitled:=msoTrue)
                                                        
    Dim newFileName As String

    newFileName = BasisPfad & "KanbanSlides_PPTX\Saved_VIS_" & Format(Now, "yyyymmdd_HHMMSS") & ".pptx"

    pptPres.SaveAs newFileName

    pptApp.ActiveWindow.ViewType = 1

    Set frontLayout = pptPres.Designs(1).SlideMaster.CustomLayouts(1)
    Set backsideLayout = pptPres.Designs(1).SlideMaster.CustomLayouts(2)

    slideIndex = pptPres.Slides.Count + 1

    ' Save list of VIS lines (for EMF filenames later, since numberList may also contain A6 lines!)
    Dim visRow As Collection
    Set visRow = New Collection

    For Each row In tbl.ListRows
        val = row.Range.Cells(1).Value

        For i = 1 To numberList.Count
            If val = numberList(i) Then
                If Trim(UCase(row.Range.Cells(16).Value)) = "VIS" Then
                    Call CreateCanbanSlides_VIS(tbl, row)
                    visRow.Add val
                End If
                Exit For
            End If
        Next i
    Next row

    If visRow.Count = 0 Then
        pptPres.Close
        Exit Sub
    End If

    pptPres.Slides(2).Delete
    pptPres.Slides(1).Delete

    Dim emfFolder As String
    emfFolder = BasisPfad & "KanbanSlides_EMF\"
    
    If Dir(emfFolder, vbDirectory) = "" Then MkDir emfFolder

    Dim s As Integer
    Dim cardNr As Long
    Dim sideNr As String
    Dim excelRow As Long
    Dim addDate As String
    Dim emfPath As String

    addDate = Format(Now, "yy-mm-dd")
    
    ' Export every slide as a standalone EMF (vector image)
    For s = 1 To pptPres.Slides.Count
        cardNr = Int((s - 1) / 2) + 1
        If s Mod 2 = 1 Then
            sideNr = "1"
        Else
            sideNr = "2"
        End If

        excelRow = visRow(cardNr)
        emfPath = emfFolder & "KanbanSlides_" & addDate & "_Slide_" & excelRow & "_" & sideNr & ".emf"

        If Dir(emfPath) <> "" Then Kill emfPath ' Overwrite any stale file from a previous run

        pptPres.Slides(s).Export emfPath, "EMF"
    Next s
    
    pptPres.Save
    pptPres.Close
    
    Debug.Print "RunVIS: exported " & visRow.Count & " card(s) as EMF, handing off to template layout"

    ' Arrange all the exported EMFs into a double-sided printable Word document
    Call EMFsIntoTemplate_VIS(emfFolder, visRow, addDate)
    
    Exit Sub

ErrHandler:
    Call HandleError("RunVIS")

End Sub


' Builds one VIS front+back slide pair for a single product row
Private Sub CreateCanbanSlides_VIS(tbl As ListObject, row As ListRow)
    
    On Error GoTo ErrHandler
    
    Dim supportTbl As ListObject
    Dim imgSaveFolder As String
    Dim kostenstelleTbl As ListObject

    Set supportTbl = ThisWorkbook.Sheets("Hilfstabellen").ListObjects("Einkauf")
    Set kostenstelleTbl = ThisWorkbook.Sheets("Hilfstabellen").ListObjects("Kostenstelle")

    ' Add slide with front layout
    pptPres.Slides(1).Duplicate
    Set pptSlide = pptPres.Slides(2)
    pptSlide.MoveTo slideIndex

    Call AdaptLayoutColor_VIS(supportTbl, row, pptSlide)

    Call AddData_Front_VIS(tbl, row, pptSlide)

    Dim bildName As String
    imgSaveFolder = BasisPfad & "ProductImages\"
    bildName = ProductImageName(row) ' from column "Produktbild", not from "Nr"

    Call InsertImage_VIS(imgSaveFolder, bildName, pptSlide, pptPres)

    slideIndex = slideIndex + 1

    ' Add slide with back layout
    pptPres.Slides(2).Duplicate
    Set pptSlide = pptPres.Slides(3)
    pptSlide.MoveTo slideIndex

    Call AdaptLayoutColor_VIS(supportTbl, row, pptSlide)

    Call AddData_Back_VIS(kostenstelleTbl, tbl, row, pptSlide)

    slideIndex = slideIndex + 1
    
    Exit Sub

ErrHandler:
    Call HandleError("CreateCanbanSlides_VIS")

End Sub


' Fills in the front-side placeholders of a VIS card
Private Sub AddData_Front_VIS(tbl As ListObject, row As ListRow, pptSlide As Object)
    
    On Error GoTo ErrHandler
    
    With pptSlide.Shapes

        .Placeholders(2).TextFrame.TextRange.Text = row.Range.Cells(2).Value

        .Placeholders(3).TextFrame.TextRange.Text = tbl.HeaderRowRange.Cells(11).Value
        .Placeholders(4).TextFrame.TextRange.Text = row.Range.Cells(11).Value & " " & row.Range.Cells(12).Value
        .Placeholders(5).TextFrame.TextRange.Text = tbl.HeaderRowRange.Cells(13).Value
        .Placeholders(6).TextFrame.TextRange.Text = row.Range.Cells(13).Value & " " & row.Range.Cells(14).Value
        .Placeholders(7).TextFrame.TextRange.Text = tbl.HeaderRowRange.Cells(8).Value
        .Placeholders(10).TextFrame.TextRange.Text = row.Range.Cells(8).Value
        .Placeholders(8).TextFrame.TextRange.Text = tbl.HeaderRowRange.Cells(9).Value
        .Placeholders(11).TextFrame.TextRange.Text = row.Range.Cells(9).Value
        .Placeholders(9).TextFrame.TextRange.Text = tbl.HeaderRowRange.Cells(10).Value
        .Placeholders(12).TextFrame.TextRange.Text = row.Range.Cells(10).Value

    End With

    Call RemoveBullets_VIS(pptSlide)
    
    Exit Sub

ErrHandler:
    Call HandleError("AddData_Front_VIS")

End Sub


' Fills in the back-side placeholders of a VIS card
Private Sub AddData_Back_VIS(supportTbl2 As ListObject, tbl As ListObject, row As ListRow, pptSlide As Object)
    
    On Error GoTo ErrHandler
    
    Dim supportTbl2Row As ListRow

    With pptSlide.Shapes

        ' Look up the "Kostenstelle"
        For Each supportTbl2Row In supportTbl2.ListRows
            If Trim(CStr(supportTbl2Row.Range.Cells(1).Value)) = Trim(CStr(row.Range.Cells(7).Value)) Then
                .Placeholders(8).TextFrame.TextRange.Text = supportTbl2Row.Range.Cells(2).Value
                Exit For
            End If
        Next supportTbl2Row

        .Placeholders(1).TextFrame.TextRange.Text = tbl.HeaderRowRange.Cells(6).Value & ": " & row.Range.Cells(6).Value

        .Placeholders(2).TextFrame.TextRange.Text = tbl.HeaderRowRange.Cells(5).Value
        .Placeholders(3).TextFrame.TextRange.Text = tbl.HeaderRowRange.Cells(3).Value
        .Placeholders(4).TextFrame.TextRange.Text = tbl.HeaderRowRange.Cells(7).Value
        .Placeholders(5).TextFrame.TextRange.Text = tbl.HeaderRowRange.Cells(4).Value
        .Placeholders(6).TextFrame.TextRange.Text = row.Range.Cells(5).Value
        .Placeholders(7).TextFrame.TextRange.Text = row.Range.Cells(3).Value
        .Placeholders(9).TextFrame.TextRange.Text = row.Range.Cells(4).Value

        ' Barcode-style representation of the product number
        .Placeholders(10).TextFrame.TextRange.Text = row.Range.Cells(4).Value
        '.Placeholders(10).TextFrame.TextRange.Font.Name = "Libre Barcode 39 Text"
        

        .Placeholders(11).TextFrame.TextRange.Text = tbl.HeaderRowRange.Cells(15).Value & ": " & row.Range.Cells(15).Value

    End With

    Call RemoveBullets_VIS(pptSlide)
    
    Exit Sub

ErrHandler:
    Call HandleError("AddData_Back_VIS")

End Sub


' Colors the VIS card's placeholders according to purchasing category.
Private Sub AdaptLayoutColor_VIS(supportTbl As ListObject, row As ListRow, pptSlide As Object)
    
    On Error GoTo ErrHandler
    
    Dim layoutColor As Long
    Dim supportTblRow As ListRow

    Set supportTbl = ThisWorkbook.Sheets("Hilfstabellen").ListObjects("Einkauf")

    layoutColor = 0
    For Each supportTblRow In supportTbl.ListRows
        If supportTblRow.Range.Cells(1).Value = row.Range.Cells(6).Value Then
            layoutColor = supportTblRow.Range.Cells(2).Interior.Color
            Exit For
        End If
    Next supportTblRow

    red = layoutColor Mod 256
    green = (layoutColor \ 256) Mod 256
    blue = (layoutColor \ 256 \ 256) Mod 256

    With pptSlide.Shapes
        If .Placeholders.Count >= 12 Then
            ' Layout variant with 12+ placeholders (e.g. front side)
            .Placeholders(2).Fill.ForeColor.RGB = RGB(red, green, blue)
            .Placeholders(3).Fill.ForeColor.RGB = RGB(red, green, blue)
            .Placeholders(5).Fill.ForeColor.RGB = RGB(red, green, blue)
            .Placeholders(7).Fill.ForeColor.RGB = RGB(red, green, blue)
            .Placeholders(8).Fill.ForeColor.RGB = RGB(red, green, blue)
            .Placeholders(9).Fill.ForeColor.RGB = RGB(red, green, blue)
        Else
            ' Layout variant with fewer placeholders (e.g. back side)
            .Placeholders(1).Fill.ForeColor.RGB = RGB(red, green, blue)
            .Placeholders(2).Fill.ForeColor.RGB = RGB(red, green, blue)
            .Placeholders(3).Fill.ForeColor.RGB = RGB(red, green, blue)
            .Placeholders(4).Fill.ForeColor.RGB = RGB(red, green, blue)
            .Placeholders(5).Fill.ForeColor.RGB = RGB(red, green, blue)
        End If
    End With
    
    Exit Sub

ErrHandler:
    Call HandleError("AdaptLayoutColor_VIS")

End Sub


' Inserts the product image into a VIS card, rotated 270 degrees and scaled
' to fit a fixed-size field while preserving aspect ratio.
Private Sub InsertImage_VIS(saveFolder As String, imgName As String, pptSlide As Object, pptPres As Object)
    
    On Error GoTo ErrHandler
    
    Dim img As Object
    Dim imgFile As String

    imgFile = saveFolder & imgName

    If imgName <> "" And Dir(imgFile) <> "" Then
        Set img = pptSlide.Shapes.AddPicture(Filename:=imgFile, _
                                             LinkToFile:=msoFalse, _
                                             SaveWithDocument:=msoTrue, _
                                             Left:=0, Top:=0, _
                                             Width:=-1, Height:=-1)
        Dim cmToPoints As Double
        cmToPoints = 72 / 2.54
    
        With img
            
            .LockAspectRatio = msoTrue
            
            .Height = 3 * cmToPoints
            
            If .Width > 5.3 * cmToPoints Then
                .Width = 5.4 * cmToPoints
            End If
                
            .Rotation = 270
            .Left = (pptPres.PageSetup.SlideWidth - .Width) / 2 + 2.6 * cmToPoints
            .Top = ((5.4 * cmToPoints) - .Height) / 2

        End With

    Else
        Exit Sub
    End If
    
    Exit Sub

ErrHandler:
    Call HandleError("InsertImage_VIS")

End Sub


' Lays out all exported front/back EMFs onto the A4 print template, positioned via
' fixed coordinates. Produces 2 slides per page (front page + back page) with
' up to 10 cards each (2 columns x 5 rows), then exports the result as PDF.
Private Sub EMFsIntoTemplate_VIS(emfFolder As String, visRow As Collection, addDate As String)

    On Error GoTo ErrHandler

    Dim templatePres As PowerPoint.Presentation
    Dim cardsPerPage As Long
    Dim numberOfCards As Long
    Dim numberOfPages As Long
    Dim pageNr As Long
    Dim posInPage As Long
    Dim globalNr As Long
    Dim rowInGrid As Long
    Dim colInGrid As Long
    Dim frontLeftPt As Single
    Dim frontTopPt As Single
    Dim slideW As Single
    Dim slideH As Single
    Dim frontSlide As PowerPoint.Slide
    Dim backSlide As PowerPoint.Slide
    Dim frontEMF As String
    Dim backEMF As String
    Dim img As Object
    Dim leftPt As Single
    Dim topPt As Single

    cardsPerPage = VIS_Cols * VIS_Rows
    numberOfCards = visRow.Count
    numberOfPages = Int((numberOfCards - 1) / cardsPerPage) + 1
    
    Debug.Print "EMFsIntoTemplate_VIS: laying out " & numberOfCards & " card(s) across " & numberOfPages & " page(s)"

    ' Reuse the already-open PowerPoint instance
    On Error Resume Next
    Set pptApp = GetObject(, "PowerPoint.Application")
    If pptApp Is Nothing Then Set pptApp = CreateObject("PowerPoint.Application")
    On Error GoTo ErrHandler

    pptApp.Visible = True

    ' Open the A4 print template. It gets duplicated once per front/back page and deleted at the end.
    Set templatePres = pptApp.Presentations.Open(Filename:=BasisPfad & "Druckvorlage_Visitenkarte.pptx::Kanban::", _
                                                  ReadOnly:=msoFalse, _
                                                  WithWindow:=msoTrue, _
                                                  Untitled:=msoTrue)

    ' Own name ("_Druck") so it can never collide with the card deck saved by RunVIS
    ' a moment earlier under Saved_VIS_<same timestamp>.pptx
    Dim newFileName As String
    newFileName = BasisPfad & "KanbanSlides_PPTX\Saved_VIS_Druck_" & Format(Now, "yyyymmdd_HHMMSS") & ".pptx"
    templatePres.SaveAs newFileName

    slideIndex = templatePres.Slides.Count + 1

    slideW = templatePres.PageSetup.SlideWidth
    slideH = templatePres.PageSetup.SlideHeight

    For pageNr = 1 To numberOfPages

        ' Front page for this batch of up to 10 cards
        templatePres.Slides(1).Duplicate
        Set frontSlide = templatePres.Slides(2)
        frontSlide.MoveTo slideIndex
        slideIndex = slideIndex + 1

        ' Back page
        templatePres.Slides(1).Duplicate
        Set backSlide = templatePres.Slides(2)
        backSlide.MoveTo slideIndex
        slideIndex = slideIndex + 1

        For posInPage = 1 To cardsPerPage
            globalNr = (pageNr - 1) * cardsPerPage + posInPage
            If globalNr > numberOfCards Then Exit For

            rowInGrid = Int((posInPage - 1) / VIS_Cols) + 1
            colInGrid = ((posInPage - 1) Mod VIS_Cols) + 1

            ' Front image: placed directly at its grid position
            frontLeftPt = CmToPt(VIS_MarginLeftCm + (colInGrid - 1) * (VIS_CardWidthCm + VIS_ColGapCm))
            frontTopPt = CmToPt(VIS_MarginTopCm + (rowInGrid - 1) * VIS_CardHeightCm)

            frontEMF = emfFolder & "KanbanSlides_" & addDate & "_Slide_" & visRow(globalNr) & "_1.emf"
            If Dir(frontEMF) <> "" Then
                Set img = frontSlide.Shapes.AddPicture(Filename:=frontEMF, _
                                                        LinkToFile:=msoFalse, _
                                                        SaveWithDocument:=msoTrue, _
                                                        Left:=frontLeftPt, Top:=frontTopPt, _
                                                        Width:=CmToPt(VIS_CardWidthCm), _
                                                        Height:=CmToPt(VIS_CardHeightCm))
            
            End If

            ' Back image: mirrored around the real page size so that it lands exactly
            ' behind its front after the printer flips the sheet (see VIS_FlipLongEdge).
            If VIS_FlipLongEdge Then
                ' Sheet is flipped around its long (vertical) edge: left <-> right
                leftPt = slideW - frontLeftPt - CmToPt(VIS_CardWidthCm)
                topPt = frontTopPt
            Else
                ' Sheet is flipped around its short (horizontal) edge: top <-> bottom
                leftPt = frontLeftPt
                topPt = slideH - frontTopPt - CmToPt(VIS_CardHeightCm)
            End If

            backEMF = emfFolder & "KanbanSlides_" & addDate & "_Slide_" & visRow(globalNr) & "_2.emf"
            If Dir(backEMF) <> "" Then
                Set img = backSlide.Shapes.AddPicture(Filename:=backEMF, _
                                                       LinkToFile:=msoFalse, _
                                                       SaveWithDocument:=msoTrue, _
                                                       Left:=leftPt, Top:=topPt, _
                                                       Width:=CmToPt(VIS_CardWidthCm), _
                                                       Height:=CmToPt(VIS_CardHeightCm))

                ' The card artwork is rotated by 90 degrees on the slide, so a long-edge
                ' flip of the sheet is a SHORT-edge flip of the card itself. Turning the
                ' back by 180 degrees makes it readable when the card is flipped around
                ' its long edge like a page. (Rotation is around the centre, so the
                ' bounding box and therefore the position stay the same.)
                If VIS_FlipLongEdge Then img.Rotation = 180
            End If
        Next posInPage

    Next pageNr

    ' Remove the original blank template slide now that every page has been
    ' generated from a duplicate of it
    templatePres.Slides(1).Delete

    templatePres.Save

    Dim pdfFolder As String
    Dim pdfPath As String
    pdfFolder = BasisPfad & "KanbanSlides_PDF\"
    If Dir(pdfFolder, vbDirectory) = "" Then MkDir pdfFolder
    pdfPath = pdfFolder & "KanbanSlides_VIS_" & Format(Now, "yyyymmdd_HHMMSS") & ".pdf"

    templatePres.ExportAsFixedFormat _
        Path:=pdfPath, _
        FixedFormatType:=ppFixedFormatTypePDF, _
        Intent:=ppFixedFormatIntentPrint
        
    ' A brief pause using DoEvents, to prevent excel from freezing during this process,
    ' ensures that Save/Close do not encounter this issue.
    Dim waitUntil As Single
    waitUntil = Timer + 1
    Do While Timer < waitUntil
        DoEvents
    Loop
    
    pptApp.DisplayAlerts = ppAlertsNone
    templatePres.Save
    
    On Error Resume Next
    templatePres.Close
    Err.Clear
    On Error GoTo ErrHandler
    
    pptApp.DisplayAlerts = ppAlertsAll
    
    Debug.Print "EMFsIntoTemplate_VIS: done, exported " & pdfPath

    Exit Sub

ErrHandler:
    On Error Resume Next
    If Not pptApp Is Nothing Then pptApp.DisplayAlerts = ppAlertsAll
    On Error GoTo 0
    Call HandleError("EMFsIntoTemplate_VIS")
    
End Sub


' Prompts the user for which table row numbers (or ranges, e.g. "1, 2-5, 8")
' to generate cards for, and fills the module-level numberList Collection.
Private Sub InputRange()
    
    On Error GoTo ErrHandler
    
    Dim inputText As String
    Dim val() As String
    Dim i As Long
    Dim startValue As Long, endValue As Long
    Dim numericRange As Long

    inputText = InputBox("Bitte geben Sie die Zeilennummern oder -bereiche der Materialien ein, für welche Sie Kanban-Karten erstellen möchten (z.B. 1, 2-5, 8):", "Materialien Auswählen")

    If inputText <> "" Then
        val = Split(inputText, ",")

        For i = LBound(val) To UBound(val)
            If InStr(val(i), "-") > 0 Then
                ' Range like "2-5" - expand into individual numbers
                startValue = Split(Trim(val(i)), "-")(0)
                endValue = Split(Trim(val(i)), "-")(1)

                For numericRange = startValue To endValue
                    numberList.Add numericRange
                Next numericRange
            Else
                numberList.Add CLng(Trim(val(i)))
            End If
        Next i
    Else
        MsgBox "Keine Eingabe erhalten.", vbExclamation
    End If
    
    Debug.Print "InputRange: " & numberList.Count & " row number(s) selected"
    
    Exit Sub

ErrHandler:
    Call HandleError("InputRange")

End Sub

