Attribute VB_Name = "Table"
Option Explicit

Dim lastRow As Long


Public Sub AdaptRowIndex()

    On Error GoTo ErrHandler

    Dim rowIndex As Long
    Dim row As ListRow

    Debug.Print "AdaptRowIndex: start"
            
    ws.Unprotect
    
    ' Set start index
    rowIndex = 1
    
    ' Loop through table rows and set index if row is visible
    For Each row In tbl.ListRows
        If Not row.Range.EntireRow.Hidden Then
            row.Range.Cells(1).Value = rowIndex
            rowIndex = rowIndex + 1
        Else
            row.Range.Cells(1).Value = 0
        End If
    Next row
    
    BlockEditing
    
    Debug.Print "AdaptRowIndex: done, " & (rowIndex - 1) & " visible row(s) indexed"

    Exit Sub

ErrHandler:
    MsgBox "Fehler in AdaptRowIndex: " & Err.Description, vbCritical
    
End Sub


Public Sub AdaptTblSize()
    
    On Error GoTo ErrHandler

    Debug.Print "AdaptTblSize: start"
    
    ws.Unprotect
    
    CheckLastRow
       tbl.Resize ws.Range(tbl.HeaderRowRange.Cells(1), ws.Cells(lastRow, tbl.Range.Columns.Count))

    BlockEditing
    
    Debug.Print "AdaptTblSize: done, lastRow=" & lastRow

    Exit Sub

ErrHandler:
    MsgBox "Fehler in AdaptTblSize: " & Err.Description, vbCritical
      
End Sub



Private Sub CheckLastRow()

    On Error GoTo ErrHandler

    Dim i As Long
    
    
    ' Determine last row with data in columns B:P, start check with header
    lastRow = tbl.HeaderRowRange.row
    
    For i = 2 To (imgColumn - 1)
        lastRow = Application.WorksheetFunction.Max(lastRow, ws.Cells(ws.Rows.Count, i).End(xlUp).row)
    Next i
    
    Exit Sub

ErrHandler:
    MsgBox "Fehler in CheckLastRow: " & Err.Description, vbCritical
    
End Sub


Public Sub DeleteEmptyRows()

    On Error GoTo ErrHandler

    Dim rng As Range
    Dim i As Long
    Dim rowIsEmpty As Boolean
    
    Debug.Print "DeleteEmptyRows: start"
    
    ws.Unprotect
    
    ' Define table range
    Set rng = tbl.DataBodyRange
    
    ' Loop through rows and delete if if colums B:P empty
    For i = rng.Rows.Count To 1 Step -1
        rowIsEmpty = Trim(CStr(rng.Rows(i).Columns(2).Value)) = ""
        
        If rowIsEmpty Then
            Application.DisplayAlerts = False
            rng.Rows(i).Delete
            Application.DisplayAlerts = True
        End If
    Next i

    BlockEditing

    Debug.Print "DeleteEmptyRows: done"

    Exit Sub

ErrHandler:
    Application.DisplayAlerts = True
    MsgBox "Fehler in DeleteEmptyRows: " & Err.Description, vbCritical

End Sub


