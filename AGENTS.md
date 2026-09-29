# Architecture rules

- The active workout screen owns a fixed app-height shell and must ignore visual viewport resizing while open, because the iOS keyboard must overlay rather than shift its header, content, or footer.
