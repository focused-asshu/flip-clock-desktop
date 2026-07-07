{
  "targets": [
    {
      "target_name": "workerw",
      "sources": [ "src/native/workerw.cc" ],
      "conditions": [
        ["OS=='win'", { "libraries": [ "user32.lib" ] }]
      ]
    }
  ]
}
