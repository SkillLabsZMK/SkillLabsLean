Attribute VB_Name = "DieseArbeitsmappe"
Attribute VB_Base = "0{00020819-0000-0000-C000-000000000046}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = True
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = True
Private Sub Workbook_Open()

    Dim shp As Shape
    Dim ws As Worksheet

    Debug.Print "Workbook_Open: start"

    ' Sicherstellen dass das Sheet existiert
    On Error Resume Next
    Set ws = ThisWorkbook.Sheets("Kanban")
    On Error GoTo 0

    If ws Is Nothing Then
        MsgBox "Sheet 'Kanban' nicht gefunden!", vbCritical
        Exit Sub
    End If

    On Error Resume Next
    ws.Unprotect
    If Err.Number <> 0 Then
        MsgBox "Fehler beim Entsperren: " & Err.Description, vbCritical
        Exit Sub
    End If
    On Error GoTo 0

    InitializeWorksheet

    ' Remove filters
    If ThisWorkbook.Sheets("Kanban").ListObjects("Materialliste").AutoFilter.FilterMode Then
        ThisWorkbook.Sheets("Kanban").ListObjects("Materialliste").AutoFilter.ShowAllData
    End If


    ' Delete all Buttons for reset
    For Each shp In ThisWorkbook.Sheets("Kanban").Shapes
        If Left(shp.Name, 7) = "Button_" Then
            shp.Delete
        End If
    Next shp

    AdaptTbl
    
    On Error Resume Next
    With ActiveWindow
        .SplitRow = 4
        .FreezePanes = True
    End With
    On Error GoTo 0

    Debug.Print "Workbook_Open: done"

End Sub
