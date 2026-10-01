Attribute VB_Name = "Buttons"
Option Explicit

Dim btn As Object
Dim shp As Shape
Dim img As String
Dim imgName As String
Dim btnName As String


Public Sub CreateBtns()

    Dim row As ListRow
    Dim cellVal As String
    Dim rowHasData As Boolean

    Debug.Print "CreateBtns: start"

    ' Delete all buttons
    For Each shp In ws.Shapes
        If Left(shp.Name, 7) = "Button_" Or Left(shp.Name, 13) = "DeleteButton_" Then
            shp.Delete
        End If
    Next shp

    For Each row In tbl.ListRows

         ' Check by name whether there is an image in current row and create button by need
        imgName = "Image_" & row.Index
        img = saveFolder & imgName & ".png"
        cellVal = Trim(CStr(tbl.DataBodyRange.Cells(row.Index, imgColumn).Value))
        rowHasData = Application.WorksheetFunction.CountA(row.Range.Columns(2).Resize(, 12)) <> 0

        If cellVal <> "" Or Dir(img) <> "" Then
            Set targetCell = ws.Cells(row.Range.row, imgColumn)
            CreateDeleteBtn

        ElseIf rowHasData Then
            tblRow = row.Index
            CreateSingleBtn

        End If

    Next row

    On Error Resume Next
    ws.Shapes("Button_0").Delete
    On Error GoTo 0

    Debug.Print "CreateBtns: done"

End Sub


Sub CreateDeleteBtn()

    On Error GoTo ErrHandler

    ' Create delete button
    Set btn = ws.Shapes.AddShape(msoShapeRectangle, 100, 100, targetCell.Height * 2, targetCell.Height)  ' Position (x, y) und Groesse (Breite, Hoehe)

    ' Edit button
    With btn
        ' Edit color
        .Fill.ForeColor.RGB = RGB(255, 0, 0)
        .Line.ForeColor.RGB = RGB(0, 0, 0)
        ' Edit text
        .TextFrame.Characters.Text = "X"
        .TextFrame.HorizontalAlignment = xlHAlignCenter
        .TextFrame.VerticalAlignment = xlVAlignCenter
        ' Edit position
        .Top = targetCell.Top
        .Left = targetCell.Left + targetCell.Width - .Width
        .Placement = xlMoveAndSize
        ' Add function
        .OnAction = "DeleteImg"
        ' Edit name
        .Name = "DeleteButton_" & (targetCell.row - tbl.HeaderRowRange.row)
    End With

    Exit Sub

ErrHandler:
    MsgBox "Fehler in CreateDeleteBtn: " & Err.Description, vbCritical

End Sub


Public Sub CreateSingleBtn()

    On Error GoTo ErrHandler

    ' Reset
    Set btn = Nothing

    ' Check by name whether there is a button or image in current row
    imgName = "Image_" & tblRow
    btnName = "Button_" & tblRow

    img = saveFolder & imgName & ".png"

    On Error Resume Next
    Set btn = ws.Shapes(btnName)
    On Error GoTo ErrHandler


    ' Check content of colums B:P of current row
    If Application.WorksheetFunction.CountA(tbl.DataBodyRange.Rows(tblRow).Columns(2).Resize(, (imgColumn - 2))) <> 0 Then
        ' Create button by need
        If Dir(img) = "" And btn Is Nothing Then
            ' Add button
            Set btn = ws.Buttons.Add( _
                Left:=tbl.DataBodyRange.Cells(tblRow, imgColumn).Left, _
                Top:=tbl.DataBodyRange.Cells(tblRow, imgColumn).Top, _
                Width:=tbl.DataBodyRange.Cells(tblRow, imgColumn).Width, _
                Height:=tbl.DataBodyRange.Cells(tblRow, imgColumn).Height)

            ' Edit button
            With btn
                .Name = "Button_" & tblRow
                .OnAction = "AddImg"
                .Caption = "Produktbild hinzufuegen"
                .Placement = xlMoveAndSize
            End With
        End If
    Else
        If Not btn Is Nothing Then
            ws.Shapes(btnName).Delete
        End If
    End If

    Exit Sub

ErrHandler:
    MsgBox "Fehler in CreateSingleBtn: " & Err.Description, vbCritical

End Sub


