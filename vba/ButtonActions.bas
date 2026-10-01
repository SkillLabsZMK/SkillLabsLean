Attribute VB_Name = "ButtonActions"
Option Explicit

Public existingShapes As Collection
Public Cancel As Boolean
Public newImgs As Collection
Public imgArray() As Variant
Public currentBtn As Object
Public targetCell As Range
Dim btnName As String



Public Sub AddImg()
    
    On Error GoTo ErrHandler
    
    Dim fd As FileDialog
    Dim imgPath As String
    Dim row As Long
        
    ws.Unprotect
        
    Set newImgs = New Collection
    
    ' Get name of used button
    btnName = Application.Caller
    
    ' Call button
    Set currentBtn = ws.Buttons(btnName)
    
    ' Extracr row number from name
    row = Mid(btnName, 8)
    
    ' Call cells B:Q of extracted row
    Set targetCell = tbl.DataBodyRange.Cells(row, imgColumn)
    
    ListShapes
    
    NewImg.ChooseImg
    
    Exit Sub

ErrHandler:
    MsgBox "Fehler in AddImg: " & Err.Description, vbCritical
            
End Sub


Public Sub DeleteImg()

    On Error GoTo ErrHandler
    
    Dim img As String

    ' Get name of used delete button
    btnName = Application.Caller
    
    ' Extract row number from name
    tblRow = Mid(btnName, 14)
    
    ' Bestätigungsabfrage
    If MsgBox("Möchten Sie das Bild wirklich löschen?", vbOKCancel + vbQuestion, "Löschen bestätigen") = vbCancel Then
        Exit Sub
    End If
    
    ' Debugger for tbl
    If tbl Is Nothing Then
        Set ws = ThisWorkbook.Sheets("Kanban")
        Set tbl = ws.ListObjects("Materialliste")
    End If

    If tbl.DataBodyRange Is Nothing Then
        MsgBox "Die Tabelle enthält keine Datenzeilen."
        Exit Sub
    End If
    
    ' Get image name
    img = saveFolder & tbl.DataBodyRange.Cells(tblRow, imgColumn).Value
    
    ' Delete image
    On Error Resume Next
    Kill img
    On Error GoTo 0
    
    ' Delete file path
    tbl.DataBodyRange.Cells(tblRow, imgColumn).ClearContents
    
    ' Delete delete button
    ws.Shapes(btnName).Delete
    
    CreateSingleBtn
    
    Debug.Print "DeleteImg: deleted image for row " & tblRow

    Exit Sub

ErrHandler:
    MsgBox "Fehler in DeleteImg: " & Err.Description, vbCritical
    
End Sub


Public Sub ListShapes()

    On Error GoTo ErrHandler

    Dim shp As Shape
    Set existingShapes = New Collection

    ' Capture existing shapes
    For Each shp In ws.Shapes
        existingShapes.Add shp.Name
    Next shp

    Debug.Print "ListShapes: captured " & existingShapes.Count & " shape(s)"

    Exit Sub

ErrHandler:
    MsgBox "Fehler in ListShapes: " & Err.Description, vbCritical

End Sub
