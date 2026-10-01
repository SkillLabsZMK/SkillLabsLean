Attribute VB_Name = "DeveloperMode"
Option Explicit

Sub EnableEditing()
    
    On Error GoTo ErrHandler

    Debug.Print "EnableEditing: unprotecting 'Kanban' sheet at " & Now
    
    ThisWorkbook.Worksheets("Kanban").Unprotect
    
    Debug.Print "EnableEditing: done"

    Exit Sub

ErrHandler:
    MsgBox "Fehler beim Entsperren des Blatts 'Kanban': " & Err.Description, vbCritical

End Sub


